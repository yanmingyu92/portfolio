// RSS feed — syndication source of truth for dev.to RSS import, dlvr.it,
// and any RSS-driven channel. Emits blog posts and publication abstracts.
import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { publications } from '../data/publications';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
	const posts = await getCollection('posts', ({ data }) => !data.draft);

	const postItems = posts.map(post => ({
		title: post.data.title,
		pubDate: post.data.date,
		description: post.data.description,
		link: `/blog/${post.id}.html`,
		categories: post.data.tags,
	}));

	const pubItems = publications.map(p => ({
		title: p.title,
		pubDate: new Date(p.date.length === 4 ? `${p.date}-01-01` : p.date),
		description: `${p.venue} — ${p.abstract}`,
		link: `/papers/${p.slug}.html`,
		categories: p.keywords,
	}));

	const items = [...postItems, ...pubItems].sort((a, b) => b.pubDate.valueOf() - a.pubDate.valueOf());

	return rss({
		title: 'Jaime Yan — Research & Writing',
		description: 'AI/LLM automation for clinical trial statistical programming: papers, preprints, and technical writing.',
		site: context.site!,
		items,
	});
}
