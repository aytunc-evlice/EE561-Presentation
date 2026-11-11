# Prints the handout HTML sources to PDF with headless Edge.
# Usage:  powershell -ExecutionPolicy Bypass -File build_pdfs.ps1
$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$src = $PSScriptRoot
$out = Split-Path $src -Parent
$prof = Join-Path $env:TEMP "ee561_pdf_profile"
$jobs = @(
  @{ html = "quiz.html";            pdf = "Quiz - Building the Levels.pdf" },
  @{ html = "quiz_key.html";        pdf = "Quiz Answer Key - Building the Levels.pdf" },
  @{ html = "final_questions.html"; pdf = "Potential Final Questions - Building the Levels.pdf" }
)
foreach ($j in $jobs) {
  $in = Join-Path $src $j.html
  if (-not (Test-Path $in)) { continue }
  $url = "file:///" + ($in -replace '\\', '/' -replace ' ', '%20')
  $pdf = Join-Path $out $j.pdf
  # Start-Process joins arguments with spaces, so paths containing spaces must be quoted explicitly
  $null = Start-Process -FilePath $edge -ArgumentList @('--headless=new', '--disable-gpu', '--no-pdf-header-footer', '--virtual-time-budget=3000', "`"--user-data-dir=$prof`"", "`"--print-to-pdf=$pdf`"", $url) -NoNewWindow -Wait -PassThru
  Write-Output "$($j.pdf)"
}
