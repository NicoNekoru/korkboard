export type BlockType = 'image' | 'link' | 'text' | 'book' | 'pdf';

export interface Block {
	id: string;
	type: BlockType;
	title: string;
	description?: string;
	url?: string;
	imageUrl?: string;
	author?: string;
	content?: string;
	tags?: string[];
	note?: string;
	colorLabel?: string;
	createdAt: string;
	updatedAt?: string;
}

export interface Cluster {
	id: string;
	title: string;
	description?: string;
	tags?: string[];
	note?: string;
	colorLabel?: string;
	blocks: Block[];
	createdAt: string;
	updatedAt?: string;
}

// Edge connecting clusters (many-to-many relationship)
export interface ClusterEdge {
	id: string;
	sourceId: string; // parent cluster
	targetId: string; // child cluster
}
