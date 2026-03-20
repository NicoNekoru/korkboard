import type { Cluster, ClusterEdge } from './types';

export const sampleClusters: Cluster[] = [
	{
		id: 'design-research',
		title: 'Design Research',
		description:
			'Explorations in interface design, typography, and visual culture',
		createdAt: '2026-02-15',
		blocks: [
			{
				id: 'b1',
				type: 'image',
				title: 'Brutalist architecture in Tokyo',
				imageUrl:
					'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=600&q=80',
				createdAt: '2026-02-15',
			},
			{
				id: 'b2',
				type: 'text',
				title: 'On the nature of grids',
				content:
					'The grid is not just a tool for organizing content — it is a philosophical commitment to clarity, hierarchy, and rhythm.',
				createdAt: '2026-02-16',
			},
		],
	},
	{
		id: 'typography',
		title: 'Typography',
		description: 'Type specimens, font pairings, and lettering studies',
		createdAt: '2026-02-20',
		blocks: [
			{
				id: 'b3',
				type: 'book',
				title: 'The Elements of Typographic Style',
				author: 'Robert Bringhurst',
				description:
					'A masterwork on typography that bridges the gap between technology and aesthetics.',
				createdAt: '2026-02-18',
			},
			{
				id: 'b4',
				type: 'link',
				title: 'Fonts In Use',
				description:
					'An independent archive of typography indexed by typeface, format, and industry.',
				url: 'https://fontsinuse.com',
				createdAt: '2026-03-03',
			},
		],
	},
	{
		id: 'grid-systems',
		title: 'Grid Systems',
		description: 'Modular grids and layout structures',
		createdAt: '2026-02-22',
		blocks: [
			{
				id: 'b6',
				type: 'pdf',
				title: 'Grid Systems in Graphic Design',
				author: 'Josef Müller-Brockmann',
				description:
					'A comprehensive handbook on the use of grid systems in visual communication.',
				createdAt: '2026-02-20',
			},
		],
	},
	{
		id: 'visual-culture',
		title: 'Visual Culture',
		description: 'Art, photography, and visual references',
		createdAt: '2026-03-01',
		blocks: [
			{
				id: 'b5',
				type: 'image',
				title: 'Morning light study',
				imageUrl:
					'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&q=80',
				createdAt: '2026-02-19',
			},
			{
				id: 'b9',
				type: 'image',
				title: 'Concrete textures',
				imageUrl:
					'https://images.unsplash.com/photo-1518005020951-eccb494ad742?w=600&q=80',
				createdAt: '2026-02-23',
			},
		],
	},
	{
		id: 'reading-list',
		title: 'Reading List',
		description: 'Books, essays, and articles worth revisiting',
		createdAt: '2026-01-10',
		blocks: [
			{
				id: 'b10',
				type: 'book',
				title: 'A Pattern Language',
				author: 'Christopher Alexander',
				description:
					'Towns, buildings, construction — a timeless way of building.',
				createdAt: '2026-01-10',
			},
			{
				id: 'b11',
				type: 'text',
				title: 'Why books still matter',
				content:
					'In an age of infinite scroll, the bounded nature of a book is its greatest gift.',
				createdAt: '2026-01-12',
			},
		],
	},
	{
		id: 'tools',
		title: 'Tools & Platforms',
		description: 'Digital tools for creative work',
		createdAt: '2026-02-25',
		blocks: [
			{
				id: 'b7',
				type: 'link',
				title: 'Are.na — Visual Research',
				description:
					'A platform for collaborative research and organizing ideas visually.',
				url: 'https://www.are.na',
				createdAt: '2026-02-17',
			},
			{
				id: 'b8',
				type: 'link',
				title: 'Cosmos — Digital Gardens',
				description:
					'Build your personal internet with connected ideas and references.',
				url: 'https://cosmos.so',
				createdAt: '2026-02-21',
			},
		],
	},
];

// Define graph edges (source -> target means source contains/relates to target)
export const sampleEdges: ClusterEdge[] = [
	{ id: 'e1', sourceId: 'design-research', targetId: 'typography' },
	{ id: 'e2', sourceId: 'design-research', targetId: 'grid-systems' },
	{ id: 'e3', sourceId: 'design-research', targetId: 'visual-culture' },
	{ id: 'e4', sourceId: 'typography', targetId: 'grid-systems' }, // shared child
	{ id: 'e5', sourceId: 'reading-list', targetId: 'typography' }, // typography has multiple parents
];
