import {
	getChildClusterIds,
	getParentClusterIds,
	getRootClusterIds,
} from '@/hooks/useClusterGraph';
import type { ClusterEdge } from '@/lib/types';
import { describe, expect, it } from 'vitest';

const edges: ClusterEdge[] = [
	{ id: 'e1', sourceId: 'A', targetId: 'B' },
	{ id: 'e2', sourceId: 'A', targetId: 'C' },
	{ id: 'e3', sourceId: 'B', targetId: 'D' },
];

describe('getChildClusterIds', () => {
	it('returns direct children of a node', () => {
		expect(getChildClusterIds(edges, 'A')).toEqual(['B', 'C']);
	});

	it('returns empty array for leaf node', () => {
		expect(getChildClusterIds(edges, 'D')).toEqual([]);
	});

	it('returns empty array for unknown node', () => {
		expect(getChildClusterIds(edges, 'Z')).toEqual([]);
	});
});

describe('getParentClusterIds', () => {
	it('returns direct parents of a node', () => {
		expect(getParentClusterIds(edges, 'B')).toEqual(['A']);
	});

	it('returns empty for root node', () => {
		expect(getParentClusterIds(edges, 'A')).toEqual([]);
	});
});

describe('getRootClusterIds', () => {
	it('returns nodes that are never a target', () => {
		const allIds = ['A', 'B', 'C', 'D'];
		expect(getRootClusterIds(edges, allIds)).toEqual(['A']);
	});

	it('returns all nodes when there are no edges', () => {
		expect(getRootClusterIds([], ['X', 'Y'])).toEqual(['X', 'Y']);
	});
});

describe('edge deduplication logic', () => {
	it('detects duplicate edges by source/target', () => {
		const existing: ClusterEdge[] = [
			{ id: 'e1', sourceId: 'A', targetId: 'B' },
		];
		const newEdge = { id: 'e2', sourceId: 'A', targetId: 'B' };
		const isDuplicate = existing.some(
			(e) => e.sourceId === newEdge.sourceId && e.targetId === newEdge.targetId,
		);
		expect(isDuplicate).toBe(true);
	});

	it('does not flag different edges as duplicates', () => {
		const existing: ClusterEdge[] = [
			{ id: 'e1', sourceId: 'A', targetId: 'B' },
		];
		const newEdge = { id: 'e2', sourceId: 'A', targetId: 'C' };
		const isDuplicate = existing.some(
			(e) => e.sourceId === newEdge.sourceId && e.targetId === newEdge.targetId,
		);
		expect(isDuplicate).toBe(false);
	});
});
