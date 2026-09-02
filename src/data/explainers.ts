// Registry of interactive explainers (self-contained pages under /explainers/).
// Pages live in public/explainers/<slug>.html (vanilla HTML, zero build coupling).
// Workflow: docs/EXPLAINER-PIPELINE.md. Audit: npm run explainer:audit.

export interface Explainer {
	slug: string;
	title: string;
	description: string;
	path: string;
	published: string;
	scenes: number;
	/** content/posts ids the scenes derive from (provenance, shown on the index) */
	sourcePosts: string[];
}

export const explainers: Explainer[] = [
	{
		slug: 'clinical-data-journey',
		title: 'From Raw Data to TLF: The Clinical Data Journey',
		description:
			'How a messy EDC extract becomes a submission package — eight animated scenes covering SDTM mapping, SUPPQUAL, ADSL, BDS baseline and windowing, TLF production and QC, and Define-XML. Play it like a lecture, one beat at a time.',
		path: '/explainers/clinical-data-journey.html',
		published: '2026-09-01',
		scenes: 8,
		sourcePosts: [
			'sdtm-tutorial-domain-basics',
			'sdtm-ae-domain-mapping-example',
			'sdtm-mapping-spec-walkthrough',
			'adsl-derivation-tutorial-trtstdt',
			'adam-bds-adlb-advs-tutorial',
			'visit-windowing-baseline-locf-guide',
			'tlf-shell-to-rtf-tutorial',
			'define-xml-reviewers-guide-tutorial',
		],
	},
];

export function getExplainerByPath(path: string): Explainer | undefined {
	return explainers.find(e => e.path === path);
}
