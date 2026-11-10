# MyTube
Cloudflare Worker app using the official YouTube Data API v3. Video playback uses YouTube's privacy-enhanced embed.

Deploy with `npx wrangler deploy`. Add a Worker secret named `YOUTUBE_API_KEY` before using search. Create an API key in Google Cloud after enabling YouTube Data API v3. Never commit the key to GitHub.
