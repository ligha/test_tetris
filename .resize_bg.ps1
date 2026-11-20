Add-Type -AssemblyName System.Drawing
$src='C:\Users\fangg\Downloads\Tetris_image'
$dst='C:\Users\fangg\Documents\Developer\Python\Test\Cline\Tetris_image'
New-Item -ItemType Directory -Force -Path $dst | Out-Null
$max=1280
$codec=([System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' } | Select-Object -First 1)
$ep=New-Object System.Drawing.Imaging.EncoderParameters(1)
$ep.Param[0]=New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality,[Int64]82)
foreach($f in Get-ChildItem -LiteralPath $src -Filter *.jpg){
  $img=[System.Drawing.Image]::FromFile($f.FullName)
  $w=$img.Width; $h=$img.Height
  $s=[Math]::Min(1.0, $max/[Math]::Max($w,$h))
  $nw=[int]($w*$s); $nh=[int]($h*$s)
  $bmp=New-Object System.Drawing.Bitmap $nw,$nh
  $g=[System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.DrawImage($img,0,0,$nw,$nh)
  $g.Dispose()
  $out=Join-Path $dst $f.Name
  $bmp.Save($out,$codec,$ep)
  $bmp.Dispose(); $img.Dispose()
  Write-Output ("{0}  {1}x{2} -> {3}x{4}  {5}KB" -f $f.Name,$w,$h,$nw,$nh,[int]((Get-Item -LiteralPath $out).Length/1KB))
}
Write-Output ("TOTAL KB: " + [int]((Get-ChildItem -LiteralPath $dst -Filter *.jpg | Measure-Object -Property Length -Sum).Sum/1KB))
