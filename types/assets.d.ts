// Image imports resolve to URLs in the consumer bundler (e.g. Vite).
declare module "*.webp" {
	const url: string;
	export default url;
}
