import { puppeteerLauncher } from '@web/test-runner-puppeteer';
import { summaryReporter } from '@web/test-runner';

export default {
	browsers: [
		puppeteerLauncher({
			launchOptions: {
				headless: true,
				devtools: false,
				args: [],
			},
		}),
	],
	reporters: [
		summaryReporter(),
	],
};
