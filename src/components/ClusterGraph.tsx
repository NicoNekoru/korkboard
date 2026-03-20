import { useClusters } from '@/context/ClusterContext';
import type { BlockType } from '@/lib/types';
import {
	type SimulationLinkDatum,
	type SimulationNodeDatum,
	forceCenter,
	forceCollide,
	forceLink,
	forceManyBody,
	forceSimulation,
	forceX,
	forceY,
} from 'd3-force';
import { BookOpen, FileText, Image, Link2, Type } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface GraphNode extends SimulationNodeDatum {
	id: string;
	title: string;
	isFocused: boolean; // the current cluster
	isChild: boolean; // direct child of focused
	isDimmed: boolean; // neighborhood but not focused/child
}

interface GraphLink extends SimulationLinkDatum<GraphNode> {
	id: string;
	isDimmed: boolean;
}

interface ClusterGraphProps {
	clusterId: string;
	className?: string;
}

export function ClusterGraph({ clusterId, className = '' }: ClusterGraphProps) {
	const navigate = useNavigate();
	const {
		clusters,
		edges: clusterEdges,
		getChildClusters,
		getParentClusters,
		getClusterById,
	} = useClusters();

	const svgRef = useRef<SVGSVGElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const nodesRef = useRef<GraphNode[]>([]);
	const linksRef = useRef<GraphLink[]>([]);
	const simRef = useRef<ReturnType<typeof forceSimulation<GraphNode>> | null>(
		null,
	);
	const rafRef = useRef<number>(0);
	const transformRef = useRef({ x: 0, y: 0, k: 1 });
	const panRef = useRef<{
		startX: number;
		startY: number;
		startTx: number;
		startTy: number;
	} | null>(null);
	const dragRef = useRef<{ node: GraphNode } | null>(null);
	const hoveredRef = useRef<string | null>(null);
	const [hoveredNode, setHoveredNode] = useState<string | null>(null);
	const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
	const [renderKey, setRenderKey] = useState(0);

	useEffect(() => {
		hoveredRef.current = hoveredNode;
	}, [hoveredNode]);

	const renderFrame = useCallback(() => {
		const svg = svgRef.current;
		if (!svg) return;
		const g = svg.querySelector<SVGGElement>('#cluster-graph-transform');
		if (!g) return;

		const t = transformRef.current;
		g.setAttribute('transform', `translate(${t.x},${t.y}) scale(${t.k})`);

		const hovered = hoveredRef.current;
		const nodes = nodesRef.current;
		const links = linksRef.current;

		// Edges
		const edgeEls = g.querySelectorAll<SVGLineElement>('.cg-edge');
		links.forEach((link, i) => {
			const el = edgeEls[i];
			if (!el) return;
			const s = link.source as GraphNode;
			const t2 = link.target as GraphNode;
			el.setAttribute('x1', String(s.x || 0));
			el.setAttribute('y1', String(s.y || 0));
			el.setAttribute('x2', String(t2.x || 0));
			el.setAttribute('y2', String(t2.y || 0));

			const highlighted = hovered === s.id || hovered === t2.id;
			el.setAttribute(
				'stroke',
				highlighted ? 'hsl(var(--accent))' : 'hsl(var(--muted-foreground))',
			);
			el.setAttribute('stroke-width', highlighted ? '2' : '1');
			el.setAttribute(
				'stroke-opacity',
				link.isDimmed && !highlighted ? '0.12' : highlighted ? '1' : '0.4',
			);
		});

		// Nodes
		const nodeGroups = g.querySelectorAll<SVGGElement>('.cg-node');
		nodes.forEach((node, i) => {
			const group = nodeGroups[i];
			if (!group) return;
			const isHovered = hovered === node.id;

			const hitCircle = group.children[0] as SVGCircleElement;
			const visCircle = group.children[1] as SVGCircleElement;
			const label = group.children[2] as SVGTextElement;

			const r = node.isFocused ? 12 : node.isChild ? 8 : 5;
			const rFinal = isHovered ? r + 3 : r;

			hitCircle.setAttribute('cx', String(node.x || 0));
			hitCircle.setAttribute('cy', String(node.y || 0));
			hitCircle.setAttribute('r', String(r + 12));

			visCircle.setAttribute('cx', String(node.x || 0));
			visCircle.setAttribute('cy', String(node.y || 0));
			visCircle.setAttribute('r', String(rFinal));

			const color = isHovered
				? 'hsl(var(--accent))'
				: node.isFocused
					? 'hsl(var(--primary))'
					: node.isChild
						? 'hsl(var(--foreground))'
						: 'hsl(var(--muted-foreground))';
			visCircle.setAttribute('fill', color);
			visCircle.setAttribute(
				'fill-opacity',
				node.isDimmed && !isHovered ? '0.25' : '1',
			);

			label.setAttribute('x', String(node.x || 0));
			label.setAttribute('y', String((node.y || 0) + rFinal + 14));
			label.setAttribute(
				'fill',
				isHovered
					? 'hsl(var(--accent))'
					: node.isDimmed
						? 'hsl(var(--muted-foreground))'
						: 'hsl(var(--foreground))',
			);
			label.setAttribute(
				'fill-opacity',
				node.isDimmed && !isHovered ? '0.3' : '0.9',
			);
			label.setAttribute(
				'font-weight',
				node.isFocused || isHovered ? '600' : '400',
			);
		});

		rafRef.current = requestAnimationFrame(renderFrame);
	}, []);

	// Build graph data & simulation
	useEffect(() => {
		if (!containerRef.current) return;
		const { width, height } = containerRef.current.getBoundingClientRect();
		if (width === 0 || height === 0) return;

		const childIds = new Set(getChildClusters(clusterId).map((c) => c.id));
		const parentIds = new Set(getParentClusters(clusterId).map((c) => c.id));

		// Collect neighborhood: focused + children + parents + siblings (children of parents)
		const relevantIds = new Set<string>([clusterId]);
		childIds.forEach((id) => relevantIds.add(id));
		parentIds.forEach((id) => relevantIds.add(id));
		// Siblings
		parentIds.forEach((pid) => {
			const siblingEdges = clusterEdges.filter((e) => e.sourceId === pid);
			siblingEdges.forEach((e) => relevantIds.add(e.targetId));
		});

		const existingPositions = new Map(
			nodesRef.current.map((n) => [n.id, { x: n.x, y: n.y }]),
		);

		const graphNodes: GraphNode[] = clusters
			.filter((c) => relevantIds.has(c.id))
			.map((c) => {
				const isFocused = c.id === clusterId;
				const isChild = childIds.has(c.id);
				const isDimmed = !isFocused && !isChild;
				const prev = existingPositions.get(c.id);
				return {
					id: c.id,
					title: c.title,
					isFocused,
					isChild,
					isDimmed,
					x:
						prev?.x ??
						(isFocused ? width / 2 : width / 2 + (Math.random() - 0.5) * 200),
					y:
						prev?.y ??
						(isFocused ? height / 2 : height / 2 + (Math.random() - 0.5) * 200),
				};
			});

		const nodeMap = new Map(graphNodes.map((n) => [n.id, n]));

		const graphLinks: GraphLink[] = clusterEdges
			.filter((e) => nodeMap.has(e.sourceId) && nodeMap.has(e.targetId))
			.map((e) => {
				const involvesCore =
					e.sourceId === clusterId ||
					e.targetId === clusterId ||
					(childIds.has(e.sourceId) && childIds.has(e.targetId));
				return {
					id: e.id,
					source: e.sourceId,
					target: e.targetId,
					isDimmed: !involvesCore,
				};
			});

		nodesRef.current = graphNodes;
		linksRef.current = graphLinks;

		simRef.current?.stop();

		const sim = forceSimulation<GraphNode>(graphNodes)
			.force(
				'link',
				forceLink<GraphNode, GraphLink>(graphLinks)
					.id((d) => d.id)
					.distance(80)
					.strength(0.5),
			)
			.force('charge', forceManyBody<GraphNode>().strength(-180))
			.force('center', forceCenter(width / 2, height / 2).strength(0.05))
			.force('x', forceX<GraphNode>(width / 2).strength(0.04))
			.force('y', forceY<GraphNode>(height / 2).strength(0.04))
			.force('collide', forceCollide<GraphNode>(14))
			.alphaDecay(0.015)
			.velocityDecay(0.35)
			.alphaMin(0.001);

		simRef.current = sim;
		setRenderKey((k) => k + 1);
		cancelAnimationFrame(rafRef.current);
		rafRef.current = requestAnimationFrame(renderFrame);

		return () => {
			sim.stop();
			cancelAnimationFrame(rafRef.current);
		};
	}, [
		clusterId,
		clusters,
		clusterEdges,
		getChildClusters,
		getParentClusters,
		renderFrame,
	]);

	// Interaction helpers
	const svgPointFromEvent = useCallback((e: React.MouseEvent) => {
		const t = transformRef.current;
		const rect = svgRef.current?.getBoundingClientRect();
		if (!rect) return { x: 0, y: 0 };
		return {
			x: (e.clientX - rect.left - t.x) / t.k,
			y: (e.clientY - rect.top - t.y) / t.k,
		};
	}, []);

	const findNodeAt = useCallback((pt: { x: number; y: number }) => {
		for (const node of nodesRef.current) {
			const dx = (node.x || 0) - pt.x;
			const dy = (node.y || 0) - pt.y;
			if (dx * dx + dy * dy < 20 * 20) return node;
		}
		return null;
	}, []);

	const handleMouseDown = useCallback(
		(e: React.MouseEvent) => {
			const pt = svgPointFromEvent(e);
			const node = findNodeAt(pt);
			if (node) {
				e.preventDefault();
				dragRef.current = { node };
				node.fx = node.x;
				node.fy = node.y;
				simRef.current?.alphaTarget(0.3).restart();
			} else {
				panRef.current = {
					startX: e.clientX,
					startY: e.clientY,
					startTx: transformRef.current.x,
					startTy: transformRef.current.y,
				};
			}
		},
		[svgPointFromEvent, findNodeAt],
	);

	const handleMouseMove = useCallback(
		(e: React.MouseEvent) => {
			if (dragRef.current) {
				const t = transformRef.current;
				const rect = svgRef.current?.getBoundingClientRect();
				if (!rect) return;
				dragRef.current.node.fx = (e.clientX - rect.left - t.x) / t.k;
				dragRef.current.node.fy = (e.clientY - rect.top - t.y) / t.k;
			} else if (panRef.current) {
				transformRef.current = {
					...transformRef.current,
					x: panRef.current.startTx + (e.clientX - panRef.current.startX),
					y: panRef.current.startTy + (e.clientY - panRef.current.startY),
				};
			} else {
				const pt = svgPointFromEvent(e);
				const node = findNodeAt(pt);
				const newId = node?.id ?? null;
				if (newId !== hoveredRef.current) {
					setHoveredNode(newId);
					setMousePos({ x: e.clientX, y: e.clientY });
				}
			}
		},
		[svgPointFromEvent, findNodeAt],
	);

	const handleMouseUp = useCallback(() => {
		if (dragRef.current) {
			dragRef.current.node.fx = null;
			dragRef.current.node.fy = null;
			dragRef.current = null;
			simRef.current?.alphaTarget(0);
		}
		panRef.current = null;
	}, []);

	const handleWheel = useCallback((e: React.WheelEvent) => {
		e.preventDefault();
		const factor = e.deltaY > 0 ? 0.93 : 1.07;
		const rect = svgRef.current?.getBoundingClientRect();
		if (!rect) return;
		const t = transformRef.current;
		const mx = e.clientX - rect.left;
		const my = e.clientY - rect.top;
		const newK = Math.min(Math.max(t.k * factor, 0.3), 4);
		transformRef.current = {
			k: newK,
			x: mx - (mx - t.x) * (newK / t.k),
			y: my - (my - t.y) * (newK / t.k),
		};
	}, []);

	const handleDoubleClick = useCallback(
		(e: React.MouseEvent) => {
			const pt = svgPointFromEvent(e);
			const node = findNodeAt(pt);
			if (node && node.id !== clusterId) {
				navigate(`/cluster/${node.id}`);
			}
		},
		[svgPointFromEvent, findNodeAt, navigate, clusterId],
	);

	const nodes = nodesRef.current;
	const links = linksRef.current;
	const hoveredCluster = hoveredNode ? getClusterById(hoveredNode) : null;

	const blockTypeIcon = (type: BlockType) => {
		const iconClass = 'w-3.5 h-3.5 text-muted-foreground shrink-0';
		switch (type) {
			case 'image':
				return <Image className={iconClass} />;
			case 'link':
				return <Link2 className={iconClass} />;
			case 'text':
				return <Type className={iconClass} />;
			case 'book':
				return <BookOpen className={iconClass} />;
			case 'pdf':
				return <FileText className={iconClass} />;
		}
	};

	return (
		<div
			ref={containerRef}
			className={`relative overflow-hidden bg-background cursor-grab active:cursor-grabbing rounded-lg border border-border ${className}`}
		>
			<svg
				ref={svgRef}
				key={renderKey}
				className='w-full h-full select-none'
				onMouseDown={handleMouseDown}
				onMouseMove={handleMouseMove}
				onMouseUp={handleMouseUp}
				onMouseLeave={() => {
					handleMouseUp();
					setHoveredNode(null);
				}}
				onWheel={handleWheel}
				onDoubleClick={handleDoubleClick}
			>
				<rect width='100%' height='100%' fill='transparent' />
				<g id='cluster-graph-transform'>
					{links.map((link) => (
						<line
							key={link.id}
							className='cg-edge'
							stroke='hsl(var(--muted-foreground))'
							strokeWidth='1'
							strokeOpacity='0.3'
						/>
					))}
					{nodes.map((node) => (
						<g key={node.id} className='cg-node'>
							<circle fill='transparent' r='20' />
							<circle
								r={node.isFocused ? 12 : node.isChild ? 8 : 5}
								fill='hsl(var(--foreground))'
							/>
							<text
								textAnchor='middle'
								fill='hsl(var(--foreground))'
								fillOpacity='0.9'
								fontSize='11'
								fontFamily='Space Grotesk, sans-serif'
								fontWeight={node.isFocused ? '600' : '400'}
								className='pointer-events-none select-none'
							>
								{node.title}
							</text>
						</g>
					))}
				</g>
			</svg>

			{hoveredCluster && (
				<div
					className='fixed z-50 pointer-events-none'
					style={{
						left: mousePos.x + 16,
						top: mousePos.y - 8,
						maxWidth: 240,
					}}
				>
					<div className='rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-lg transition-opacity duration-150'>
						<p className='text-xs font-semibold text-foreground mb-1.5 truncate'>
							{hoveredCluster.title}
						</p>
						{hoveredCluster.blocks.length === 0 ? (
							<p className='text-xs text-muted-foreground italic'>No blocks</p>
						) : (
							<div className='flex flex-col gap-1 max-h-36 overflow-y-auto'>
								{hoveredCluster.blocks.slice(0, 6).map((block) => (
									<div
										key={block.id}
										className='flex items-center gap-2 min-w-0'
									>
										{blockTypeIcon(block.type)}
										<span className='text-xs text-foreground truncate'>
											{block.title}
										</span>
									</div>
								))}
								{hoveredCluster.blocks.length > 6 && (
									<p className='text-xs text-muted-foreground mt-0.5'>
										+{hoveredCluster.blocks.length - 6} more
									</p>
								)}
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
