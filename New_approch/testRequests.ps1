# Loop 7 times
for ($i = 1; $i -le 7; $i++) {

    Write-Host "Request $i"

    try {
        $response = Invoke-RestMethod `
            -Method POST `
            -Uri "http://localhost:9090/login" `
            -ContentType "application/json" `
            -Body '{"username":"admin","password":"1234"}'

        # Print response
        $response | ConvertTo-Json -Compress

    } catch {
        # Handle error (like 429)
        $errorResponse = $_.Exception.Response

        if ($errorResponse -ne $null) {
            $reader = New-Object System.IO.StreamReader($errorResponse.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-Output $responseBody
        } else {
            Write-Output "Request failed"
        }
    }

    Write-Host "----------------------"
}