import type { KVNamespace, D1Database } from '@cloudflare/workers-types';

declare global {
	namespace App {
		interface Platform {
			env: {
				DEYOUNG_KV: KVNamespace;
				DB: D1Database;
				SESSION_SECRET: string;
				ADMIN_EMAILS: string;
				RESEND_API_KEY: string;
			};
		}
	}
}

export {};
