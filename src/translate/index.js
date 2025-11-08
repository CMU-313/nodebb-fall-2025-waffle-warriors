
/* eslint-disable strict */

const translatorApi = module.exports;

translatorApi.translate = async function (postData) {
	// Try multiple approaches to reach the microservice
	// Use host.docker.internal for Docker networking to reach host machine
	const urls = [
		'http://host.docker.internal:5000/?content=' + encodeURIComponent(postData.content),
		'http://host.docker.internal:5001/?content=' + encodeURIComponent(postData.content),
		'http://127.0.0.1:5001/?content=' + encodeURIComponent(postData.content),
		'http://localhost:5001/?content=' + encodeURIComponent(postData.content),
		'http://127.0.0.1:5000/?content=' + encodeURIComponent(postData.content),
		'http://localhost:5000/?content=' + encodeURIComponent(postData.content),
	];

	for (const url of urls) {
		try {
			console.log('TRANSLATION DEBUG - Trying URL:', url);
			const response = await makeHttpRequest(url);
			const result = JSON.parse(response);
			console.log('TRANSLATION DEBUG - Success:', result);
			return [result.is_english, result.translated_content];
		} catch (err) {
			console.log('TRANSLATION DEBUG - Failed for URL:', url, 'Error:', err.message);
			continue;
		}
	}

	// If all URLs fail, assume content is English and return empty translation
	console.log('All microservice attempts failed, defaulting to English');
	return [true, ''];
};

function makeHttpRequest(url) {
	return new Promise((resolve, reject) => {
		const http = require('http');
		const https = require('https');
		const protocol = url.startsWith('https:') ? https : http;

		const req = protocol.get(url, (res) => {
			let data = '';
			res.on('data', (chunk) => {
				data += chunk;
			});
			res.on('end', () => {
				if (res.statusCode === 200) {
					resolve(data);
				} else {
					reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
				}
			});
		});

		req.on('error', (err) => {
			reject(err);
		});

		req.setTimeout(5000, () => {
			req.destroy();
			reject(new Error('Request timeout'));
		});
	});
}
