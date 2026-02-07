module.exports = {
	globDirectory: 'dist/',
	globPatterns: [
		'**/*.{mp3,ogg,wav,ico,svg,png,html,js,manifest,md,css}'
	],
	swDest: 'dist/sw.js',
	ignoreURLParametersMatching: [
		/^utm_/,
		/^fbclid$/
	],
	maximumFileSizeToCacheInBytes: 5000000,
};