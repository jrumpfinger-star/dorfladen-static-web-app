$secret = az staticwebapp appsettings list --name dorfladen-bestellsystem --query "properties.DV_CLIENT_SECRET" -o tsv
$env:DV_CLIENT_SECRET = $secret
python $args
