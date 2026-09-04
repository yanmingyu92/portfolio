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
		/** Content type: deep-dive = research companion; explainer = field guide / hot topic; survey = quarterly state-of-field; note = short observation; tutorial = systematic training series post */
		kind: z.enum(['deep-dive', 'explainer', 'survey', 'note', 'tutorial']).default('deep-dive'),
		/** Series slug a tutorial belongs to, e.g. "clinical-sp-bootcamp" (tutorials only) */
		series: z.string().optional(),
		/** Reading order within the series, 0 = syllabus/roadmap (tutorials only) */
		seriesOrder: z.number().optional(),
		/** Path to the companion downloadable Claude skill artifact, e.g. /skills/adam-adsl-derivation/SKILL.md */
		skillArtifact: z.string().optional(),
		/** YouTube video id of the companion video (set after upload-video.mjs / manual upload) */
		videoId: z.string().optional(),
		/** Site-relative path to the AI-narrated audio version, e.g. /audio/my-post.mp3 ("Listen to this article" player) */
		audioPath: z.string().optional(),
		/** Path to the companion interactive explainer, e.g. /explainers/clinical-data-journey.html (entry card renders under the TL;DR) */
		explainer: z.string().optional(),
		/** Site-relative canonical path, e.g. /blog/my-post.html */
		canonicalPath: z.string().optional(),
		/** Slug of a related entry in src/data/publications.ts */
		paperRef: z.string().optional(),
	}),
});

export const collections = { posts };
