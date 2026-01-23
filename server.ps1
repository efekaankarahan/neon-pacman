# PowerShell Web Server for Efe Game
# Listens on http://localhost:3000
# Saves data to names.txt and leaderboard.txt

$port = 3000
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()

Write-Host "Server running at http://localhost:$port/"
Write-Host "Press Ctrl+C to stop."

$namesFile = Join-Path $PSScriptRoot "names.txt"
$leaderboardFile = Join-Path $PSScriptRoot "leaderboard.txt"

function Add-CorsHeaders($response) {
    $response.AddHeader("Access-Control-Allow-Origin", "*")
    $response.AddHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    $response.AddHeader("Access-Control-Allow-Headers", "Content-Type")
}

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        $path = $request.Url.LocalPath

        # CORS
        Add-CorsHeaders $response
        if ($request.HttpMethod -eq "OPTIONS") {
            $response.StatusCode = 204
            $response.Close()
            continue
        }

        # API Handlers
        if ($path -eq "/api/save-score" -and $request.HttpMethod -eq "POST") {
            try {
                $reader = New-Object System.IO.StreamReader $request.InputStream
                $body = $reader.ReadToEnd() | ConvertFrom-Json
                
                # Update Leaderboard
                $entry = "$($body.game)|$($body.name)|$($body.score)"
                $current = if (Test-Path $leaderboardFile) { Get-Content $leaderboardFile } else { @() }
                $current += $entry
                # Sort and rewrite (Simple text based sort might fail for numbers, need object)
                $sorted = $current | ConvertFrom-Csv -Delimiter "|" -Header "Game", "Name", "Score" | 
                Sort-Object -Property @{Expression = { [int]$_.Score }; Descending = $true } | 
                Select-Object -First 100 
                
                $csv = $sorted | ForEach-Object { "$($_.Game)|$($_.Name)|$($_.Score)" }
                $csv | Set-Content $leaderboardFile

                # Log Name (Visitor)
                $logEntry = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss'): $($body.name) (Played $($body.game))"
                Add-Content $namesFile $logEntry

                $response.StatusCode = 200
                $bytes = [System.Text.Encoding]::UTF8.GetBytes('{"success":true}')
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            }
            catch {
                $response.StatusCode = 500
                Write-Host "Error: $_"
            }
        }
        elseif ($path -eq "/api/leaderboard" -and $request.HttpMethod -eq "GET") {
            try {
                $query = [System.Web.HttpUtility]::ParseQueryString($request.Url.Query)
                $gameFilter = $query["game"]
                
                $data = @()
                if (Test-Path $leaderboardFile) {
                    $lines = Get-Content $leaderboardFile
                    if ($lines) {
                        $all = $lines | ConvertFrom-Csv -Delimiter "|" -Header "Game", "Name", "Score" 
                        if ($gameFilter -and $gameFilter -ne "ALL") {
                            $data = $all | Where-Object { $_.Game -eq $gameFilter } 
                        }
                        else {
                            $data = $all
                        }
                        $data = $data | Select-Object -First 20 |
                        Select-Object @{N = 'game'; E = { $_.Game } }, @{N = 'name'; E = { $_.Name } }, @{N = 'score'; E = { [int]$_.Score } }
                    }
                }
                
                $json = $data | ConvertTo-Json -Compress
                if (-not $json) { $json = "[]" }
                $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
                $response.ContentType = "application/json"
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            }
            catch {
                $response.StatusCode = 500
                Write-Host "Leaderboard Error: $_"
            }
        }
        else {
            # Static File Server
            $localPath = Join-Path $PSScriptRoot ($path.TrimStart('/'))
            if ($path -eq "/") { $localPath = Join-Path $PSScriptRoot "index.html" }
            
            if (Test-Path $localPath -PathType Leaf) {
                try {
                    $bytes = [System.IO.File]::ReadAllBytes($localPath)
                    
                    $apiPath = $path; # dummy
                    if ($path.EndsWith(".html")) { $response.ContentType = "text/html" }
                    elseif ($path.EndsWith(".js")) { $response.ContentType = "application/javascript" }
                    elseif ($path.EndsWith(".css")) { $response.ContentType = "text/css" }
                    elseif ($path.EndsWith(".png")) { $response.ContentType = "image/png" }

                    $response.OutputStream.Write($bytes, 0, $bytes.Length)
                }
                catch {
                    $response.StatusCode = 500
                }
            }
            else {
                $response.StatusCode = 404
            }
        }
        $response.Close()
    }
}
finally {
    $listener.Stop()
}
