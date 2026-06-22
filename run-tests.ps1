# Playwright Tests gegen die Bestellsystem-Umgebung ausführen
$env:TEST_URL = "https://witty-island-064f9d903.7.azurestaticapps.net"

$testFile = $args[0]
if ($testFile) {
    npx playwright test $testFile --reporter=line
} else {
    npx playwright test --reporter=line
}
