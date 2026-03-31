param(
    [switch]$Seed
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$frontendPath = Join-Path $root 'frontend'

$pythonCommand = $null
if (Get-Command python -ErrorAction SilentlyContinue) {
    $pythonCommand = 'python'
} elseif (Get-Command py -ErrorAction SilentlyContinue) {
    $pythonCommand = 'py'
} else {
    throw 'Python não encontrado. Instale o Python e tente novamente.'
}

if (-not (Test-Path (Join-Path $frontendPath 'node_modules'))) {
    Write-Host 'Instalando dependências do frontend...'
    Push-Location $frontendPath
    npm install
    Pop-Location
}

if ($Seed) {
    Write-Host 'Executando seed de dados...'
    Push-Location $root
    & $pythonCommand -m backend.seed
    Pop-Location
}

$backendCommand = "Set-Location -Path '$root'; $pythonCommand -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000"
$frontendCommand = "Set-Location -Path '$frontendPath'; npm run dev"

$backendProcess = Start-Process -FilePath 'powershell.exe' -ArgumentList '-NoExit', '-Command', $backendCommand -PassThru
$frontendProcess = Start-Process -FilePath 'powershell.exe' -ArgumentList '-NoExit', '-Command', $frontendCommand -PassThru

Write-Host "Backend iniciado (PID: $($backendProcess.Id))"
Write-Host "Frontend iniciado (PID: $($frontendProcess.Id))"
Write-Host 'Feche as janelas dos serviços para encerrar.'
