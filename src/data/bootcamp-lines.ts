// Line grouping for the Clinical SP Bootcamp series sidebar.
// part numbers = seriesOrder values in content/posts (docs/BOOTCAMP-SERIES-PLAN.md).
export const seriesLines = [
	{ label: 'Start Here', parts: [0, 15] },
	{ label: 'SDTM', parts: [4, 5, 6] },
	{ label: 'ADaM', parts: [2, 7, 8, 9] },
	{ label: 'TLF', parts: [3] },
	{ label: 'SCE & Modern Workflow', parts: [1, 12, 13, 14] },
	{ label: 'Career', parts: [10, 11] },
];

export const seriesSlugify = (s: string) =>
	s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
