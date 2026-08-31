import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const posts = defineCollection({
	loader: glob({ pattern: '**/*.md', base: './content/posts' }),
	schema: z.object({
		title: z.string(),
		date: z.coerce.date(),
		description: z.string(),
		tags: z.array(z.string()).default([]),
		draft: z.boolean().default(false),
		/** Content type: deep-dive = research companion; explainer = field guide / hot topic; note = short observation */
		kind: z.enum(['deep-dive', 'explainer', 'note']).default('deep-dive'),
		/** Site-relative canonical path, e.g. /blog/my-post.html */
		canonicalPath: z.string().optional(),
		/** Slug of a related entry in src/data/publications.ts */
		paperRef: z.string().optional(),
	}),
});

export const collections = { posts };
