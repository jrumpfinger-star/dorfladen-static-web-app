import requests

url = 'https://kind-pebble-072605b03.7.azurestaticapps.net/api/werbebilder?sharepoint=1'
payload = {'articles': [{'artikelnummer': '6018', 'edeka_nr': '', 'strichcode': '6018'}]}
r = requests.post(url, json=payload, timeout=30)
print('status', r.status_code)
print(r.text[:2000])
