import { GraphSearch } from '@/components/GraphSearch';
import { useClusters } from '@/context/ClusterContext';
import type { BlockType } from '@/lib/types';
import {
	type ForceLink,
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
	blockCount: number;
}

interface GraphLink extends SimulationLinkDatum<GraphNode> {
	id: string;
}

function GraphPage() {
	const navigate = useNavigate();
	const { clusters, edges: clusterEdges, getClusterById } = useClusters();
	const svgRef = useRef<SVGSVGElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	// Force parameters
	const [repulsion, setRepulsion] = useState(200);
	const [attraction, setAttraction] = useState(0.4);
	const [nodeRadius, setNodeRadius] = useState(8);

	// Refs for simulation data (avoids React re-render on every tick)
	const nodesRef = useRef<GraphNode[]>([]);
	const linksRef = useRef<GraphLink[]>([]);
	const simRef = useRef<ReturnType<typeof forceSimulation<GraphNode>> | null>(
		null,
	);
	const rafRef = useRef<number>(0);

	// Interaction state
	const dragRef = useRef<{ node: GraphNode } | null>(null);
	const transformRef = useRef({ x: 0, y: 0, k: 1 });
	const panRef = useRef<{
		startX: number;
		startY: number;
		startTx: number;
		startTy: number;
	} | null>(null);
	const [hoveredNode, setHoveredNode] = useState<string | null>(null);
	const hoveredRef = useRef<string | null>(null);
	const mousePosRef = useRef({ x: 0, y: 0 });
	const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
	const [highlightedClusterId, setHighlightedClusterId] = useState<
		string | null
	>(null);

	// Keep ref in sync for render loop
	useEffect(() => {
		hoveredRef.current = hoveredNode;
	}, [hoveredNode]);

	// Force param refs
	const repulsionRef = useRef(repulsion);
	const attractionRef = useRef(attraction);
	const nodeRadiusRef = useRef(nodeRadius);
	useEffect(() => {
		repulsionRef.current = repulsion;
	}, [repulsion]);
	useEffect(() => {
		attractionRef.current = attraction;
	}, [attraction]);
	useEffect(() => {
		nodeRadiusRef.current = nodeRadius;
	}, [nodeRadius]);

	// Direct DOM render loop — no React state updates per tick
	const renderFrame = useCallback(() => {
		const svg = svgRef.current;
		if (!svg) return;

		const g = svg.querySelector<SVGGElement>('#graph-transform');
		if (!g) return;

		const t = transformRef.current;
		g.setAttribute('transform', `translate(${t.x},${t.y}) scale(${t.k})`);

		const hovered = hoveredRef.current;
		const nr = nodeRadiusRef.current;
		const nodes = nodesRef.current;
		const links = linksRef.current;

		// Build connected set for hovered
		const connectedIds = new Set<string>();
		if (hovered) {
			for (const l of links) {
				const sId =
					typeof l.source === 'object'
						? (l.source as GraphNode).id
						: String(l.source);
				const tId =
					typeof l.target === 'object'
						? (l.target as GraphNode).id
						: String(l.target);
				if (sId === hovered) connectedIds.add(tId);
				if (tId === hovered) connectedIds.add(sId);
			}
		}

		// Update edges
		const edgeEls = g.querySelectorAll<SVGLineElement>('.graph-edge');
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
			el.setAttribute('stroke-opacity', highlighted ? '1' : '0.3');
		});

		// Update nodes
		const nodeGroups = g.querySelectorAll<SVGGElement>('.graph-node');
		nodes.forEach((node, i) => {
			const group = nodeGroups[i];
			if (!group) return;
			const isHovered = hovered === node.id;
			const isConnected = hovered !== null && connectedIds.has(node.id);
			const dimmed = hovered !== null && !isHovered && !isConnected;

			const hitCircle = group.children[0] as SVGCircleElement;
			const visCircle = group.children[1] as SVGCircleElement;
			const label = group.children[2] as SVGTextElement;

			hitCircle.setAttribute('cx', String(node.x || 0));
			hitCircle.setAttribute('cy', String(node.y || 0));
			hitCircle.setAttribute('r', String(nr + 12));

			visCircle.setAttribute('cx', String(node.x || 0));
			visCircle.setAttribute('cy', String(node.y || 0));
			visCircle.setAttribute('r', String(isHovered ? nr + 3 : nr));
			visCircle.setAttribute(
				'fill',
				isHovered || isConnected
					? 'hsl(var(--accent))'
					: 'hsl(var(--foreground))',
			);
			visCircle.setAttribute('fill-opacity', dimmed ? '0.15' : '1');

			label.setAttribute('x', String(node.x || 0));
			label.setAttribute('y', String((node.y || 0) + nr + 16));
			label.setAttribute(
				'fill',
				isHovered ? 'hsl(var(--accent))' : 'hsl(var(--foreground))',
			);
			label.setAttribute('fill-opacity', dimmed ? '0.15' : '0.9');
			label.setAttribute('font-weight', isHovered ? '600' : '400');
		});

		rafRef.current = requestAnimationFrame(renderFrame);
	}, []);

	// Initialize simulation & render loop
	useEffect(() => {
		if (!containerRef.current) return;
		const { width, height } = containerRef.current.getBoundingClientRect();

		// Preserve existing positions if nodes already exist
		const existingPositions = new Map(
			nodesRef.current.map((n) => [n.id, { x: n.x, y: n.y }]),
		);

		const graphNodes: GraphNode[] = clusters.map((c) => {
			const prev = existingPositions.get(c.id);
			return {
				id: c.id,
				title: c.title,
				blockCount: c.blocks.length,
				x: prev?.x ?? width / 2 + (Math.random() - 0.5) * 300,
				y: prev?.y ?? height / 2 + (Math.random() - 0.5) * 300,
			};
		});

		const nodeMap = new Map(graphNodes.map((n) => [n.id, n]));

		const graphLinks: GraphLink[] = clusterEdges
			.filter((e) => nodeMap.has(e.sourceId) && nodeMap.has(e.targetId))
			.map((e) => ({
				id: e.id,
				source: e.sourceId,
				target: e.targetId,
			}));

		nodesRef.current = graphNodes;
		linksRef.current = graphLinks;

		// Stop previous simulation
		simRef.current?.stop();

		const sim = forceSimulation<GraphNode>(graphNodes)
			.force(
				'link',
				forceLink<GraphNode, GraphLink>(graphLinks)
					.id((d) => d.id)
					.distance(120)
					.strength(attractionRef.current),
			)
			.force(
				'charge',
				forceManyBody<GraphNode>().strength(-repulsionRef.current),
			)
			.force('center', forceCenter(width / 2, height / 2).strength(0.05))
			.force('x', forceX<GraphNode>(width / 2).strength(0.03))
			.force('y', forceY<GraphNode>(height / 2).strength(0.03))
			.force('collide', forceCollide<GraphNode>(nodeRadiusRef.current + 6))
			.alphaDecay(0.01)
			.velocityDecay(0.3);

		// Keep simulation alive — never fully cools down
		sim.alphaMin(0.001);

		simRef.current = sim;

		// Force a DOM rebuild by triggering a single React render for the SVG structure
		setRenderKey((k) => k + 1);

		// Start render loop
		cancelAnimationFrame(rafRef.current);
		rafRef.current = requestAnimationFrame(renderFrame);

		return () => {
			sim.stop();
			cancelAnimationFrame(rafRef.current);
		};
	}, [clusters, clusterEdges, renderFrame]);

	// React to force parameter changes — reheat simulation
	useEffect(() => {
		const sim = simRef.current;
		if (!sim) return;

		sim.force('charge', forceManyBody<GraphNode>().strength(-repulsion));

		const lf = sim.force('link') as ForceLink<GraphNode, GraphLink> | undefined;
		if (lf) lf.strength(attraction);

		sim.force('collide', forceCollide<GraphNode>(nodeRadius + 6));
		sim.alpha(0.8).restart();
	}, [repulsion, attraction, nodeRadius]);

	// Render key to rebuild SVG DOM when data changes
	const [renderKey, setRenderKey] = useState(0);

	// --- Mouse interaction handlers (direct DOM, no state per frame) ---

	const svgPointFromEvent = useCallback((e: React.MouseEvent) => {
		const t = transformRef.current;
		const rect = svgRef.current?.getBoundingClientRect();
		if (!rect) return { x: 0, y: 0 };
		return {
			x: (e.clientX - rect.left - t.x) / t.k,
			y: (e.clientY - rect.top - t.y) / t.k,
		};
	}, []);

	const findNodeAt = useCallback((svgPt: { x: number; y: number }) => {
		const nr = nodeRadiusRef.current;
		for (const node of nodesRef.current) {
			const dx = (node.x || 0) - svgPt.x;
			const dy = (node.y || 0) - svgPt.y;
			if (dx * dx + dy * dy < (nr + 12) * (nr + 12)) return node;
		}
		return null;
	}, []);

	const handleMouseDown = useCallback(
		(e: React.MouseEvent) => {
			const pt = svgPointFromEvent(e);
			const node = findNodeAt(pt);

			if (node) {
				e.preventDefault();
				e.stopPropagation();
				dragRef.current = { node };
				node.fx = node.x;
				node.fy = node.y;
				const sim = simRef.current;
				if (sim) sim.alphaTarget(0.3).restart();
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
				const svgX = (e.clientX - rect.left - t.x) / t.k;
				const svgY = (e.clientY - rect.top - t.y) / t.k;
				dragRef.current.node.fx = svgX;
				dragRef.current.node.fy = svgY;
			} else if (panRef.current) {
				const dx = e.clientX - panRef.current.startX;
				const dy = e.clientY - panRef.current.startY;
				transformRef.current = {
					...transformRef.current,
					x: panRef.current.startTx + dx,
					y: panRef.current.startTy + dy,
				};
			} else {
				// Hover detection
				const pt = svgPointFromEvent(e);
				const node = findNodeAt(pt);
				const newHovered = node?.id ?? null;
				if (newHovered !== hoveredRef.current) {
					setHoveredNode(newHovered);
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
			const sim = simRef.current;
			if (sim) sim.alphaTarget(0);
		}
		panRef.current = null;
	}, []);

	const handleWheel = useCallback((e: React.WheelEvent) => {
		e.preventDefault();
		const factor = e.deltaY > 0 ? 0.93 : 1.07;
		const rect = svgRef.current?.getBoundingClientRect();
		if (!rect) return;
		const t = transformRef.current;
		const mouseX = e.clientX - rect.left;
		const mouseY = e.clientY - rect.top;
		const newK = Math.min(Math.max(t.k * factor, 0.15), 6);
		// Zoom toward cursor
		transformRef.current = {
			k: newK,
			x: mouseX - (mouseX - t.x) * (newK / t.k),
			y: mouseY - (mouseY - t.y) * (newK / t.k),
		};
	}, []);

	const handleDoubleClick = useCallback(
		(e: React.MouseEvent) => {
			const pt = svgPointFromEvent(e);
			const node = findNodeAt(pt);
			if (node) {
				navigate(`/cluster/${node.id}`);
			}
		},
		[svgPointFromEvent, findNodeAt, navigate],
	);

	// Current data for SVG structure
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
		<div className='h-[calc(100vh-3.5rem)] w-full flex flex-col relative'>
			{/* Controls */}
			<div className='px-6 py-4 border-b border-border bg-background flex flex-wrap items-end gap-6'>
				<div>
					<h1 className='font-display text-xl font-bold'>Graph View</h1>
					<p className='text-xs text-muted-foreground mt-0.5'>
						Double-click to open · Drag nodes · Scroll to zoom
					</p>
				</div>

				<GraphSearch
					onHighlight={(id) => {
						setHighlightedClusterId(id);
						if (id) setHoveredNode(id);
						else setHoveredNode(null);
					}}
					onNavigate={(id) => navigate(`/cluster/${id}`)}
					className='w-64'
				/>

				<div className='ml-auto flex flex-wrap items-end gap-6'>
					<label className='w-36'>
						<span className='mb-2 block text-xs text-muted-foreground'>
							Repulsion ({repulsion})
						</span>
						<input
							type='range'
							min={50}
							max={800}
							step={10}
							value={repulsion}
							onChange={(event) => setRepulsion(Number(event.target.value))}
							className='w-full accent-[hsl(var(--accent))]'
						/>
					</label>
					<label className='w-36'>
						<span className='mb-2 block text-xs text-muted-foreground'>
							Attraction ({attraction.toFixed(2)})
						</span>
						<input
							type='range'
							min={0.01}
							max={1}
							step={0.01}
							value={attraction}
							onChange={(event) => setAttraction(Number(event.target.value))}
							className='w-full accent-[hsl(var(--accent))]'
						/>
					</label>
					<label className='w-36'>
						<span className='mb-2 block text-xs text-muted-foreground'>
							Node Size ({nodeRadius})
						</span>
						<input
							type='range'
							min={3}
							max={24}
							step={1}
							value={nodeRadius}
							onChange={(event) => setNodeRadius(Number(event.target.value))}
							className='w-full accent-[hsl(var(--accent))]'
						/>
					</label>
				</div>
			</div>

			{/* Graph */}
			<div
				ref={containerRef}
				className='flex-1 overflow-hidden bg-background cursor-grab active:cursor-grabbing'
			>
				<svg
					role='img'
					aria-label='Knowledge graph'
					ref={svgRef}
					key={renderKey}
					className='w-full h-full select-none'
					onMouseDown={handleMouseDown}
					onMouseMove={handleMouseMove}
					onMouseUp={handleMouseUp}
					onMouseLeave={handleMouseUp}
					onWheel={handleWheel}
					onDoubleClick={handleDoubleClick}
				>
					<rect width='100%' height='100%' fill='transparent' />
					<g id='graph-transform'>
						{/* Edges — straight lines */}
						{links.map((link) => (
							<line
								key={link.id}
								className='graph-edge'
								stroke='hsl(var(--muted-foreground))'
								strokeWidth='1'
								strokeOpacity='0.3'
							/>
						))}
						{/* Nodes — dots with labels */}
						{nodes.map((node) => (
							<g key={node.id} className='graph-node'>
								{/* Hit area */}
								<circle fill='transparent' r={nodeRadius + 12} />
								{/* Visible dot */}
								<circle r={nodeRadius} fill='hsl(var(--foreground))' />
								{/* Label */}
								<text
									textAnchor='middle'
									fill='hsl(var(--foreground))'
									fillOpacity='0.9'
									fontSize='12'
									fontFamily='Space Grotesk, sans-serif'
									fontWeight='400'
									className='pointer-events-none select-none'
								>
									{node.title}
								</text>
							</g>
						))}
					</g>
				</svg>
			</div>

			{/* Hover detail panel */}
			{hoveredCluster && (
				<div
					className='fixed z-50 pointer-events-none'
					style={{
						left: mousePos.x + 16,
						top: mousePos.y - 8,
						maxWidth: 260,
					}}
				>
					<div className='rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-lg transition-opacity duration-150'>
						<p className='text-xs font-semibold text-foreground mb-1.5 truncate'>
							{hoveredCluster.title}
						</p>
						{hoveredCluster.blocks.length === 0 ? (
							<p className='text-xs text-muted-foreground italic'>No blocks</p>
						) : (
							<div className='flex flex-col gap-1 max-h-48 overflow-y-auto'>
								{hoveredCluster.blocks.slice(0, 8).map((block) => (
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
								{hoveredCluster.blocks.length > 8 && (
									<p className='text-xs text-muted-foreground mt-0.5'>
										+{hoveredCluster.blocks.length - 8} more
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

export default GraphPage;
