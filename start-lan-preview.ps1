[CmdletBinding()]
param(
  [ValidateRange(1024, 65535)]
  [int]$Port = 8080
)

$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot
$indexPath = Join-Path $projectRoot 'index.html'

if (-not (Test-Path -LiteralPath $indexPath)) {
  Write-Error "index.html을 찾을 수 없습니다: $indexPath"
  exit 1
}

$pythonCommand = Get-Command python -ErrorAction SilentlyContinue
if (-not $pythonCommand) {
  Write-Error 'Python을 찾을 수 없습니다. 이 컴퓨터에 Python을 설치하거나 python 명령을 사용할 수 있게 설정해주세요.'
  exit 1
}

$existingListener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($existingListener) {
  Write-Error "포트 $Port가 이미 사용 중입니다. 기존 미리보기 창을 닫거나 다른 포트를 지정해주세요."
  exit 1
}

$lanAddresses = Get-NetIPConfiguration |
  Where-Object {
    $_.IPv4Address -and
    $_.NetAdapter.Status -eq 'Up' -and
    $_.IPv4Address.IPAddress -notlike '169.254.*'
  } |
  ForEach-Object { $_.IPv4Address.IPAddress } |
  Sort-Object -Unique

Write-Host ''
Write-Host '현대케미칼 홈페이지 사내 미리보기를 시작합니다.' -ForegroundColor Cyan
Write-Host "이 컴퓨터: http://127.0.0.1:$Port/"

foreach ($address in $lanAddresses) {
  Write-Host "사내 접속: http://${address}:$Port/" -ForegroundColor Green
}

Write-Host "컴퓨터 이름으로 접속: http://${env:COMPUTERNAME}:$Port/"
Write-Host ''
Write-Host '같은 사내 네트워크의 사용자에게 위 사내 접속 주소를 전달하세요.'
Write-Host '이 창을 닫거나 Ctrl+C를 누르면 미리보기가 종료됩니다.'
Write-Host 'Windows 방화벽 요청이 나타나면 회사 IT 정책을 확인한 뒤 개인 네트워크만 허용하세요.' -ForegroundColor Yellow
Write-Host ''

& $pythonCommand.Source -m http.server $Port --bind 0.0.0.0 --directory $projectRoot

