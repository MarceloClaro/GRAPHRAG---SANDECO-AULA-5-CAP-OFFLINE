
import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import * as d3 from 'd3';
import { GraphData, GraphNode } from '../../types';

export interface ForceGraphRef {
  downloadGraphImage: () => void;
}

interface Props {
  data: GraphData;
  onNodeClick: (node: GraphNode) => void;
  highlightedClusterIds?: number[]; // Nova prop para filtro visual
}

const ForceGraph = forwardRef<ForceGraphRef, Props>(({ data, onNodeClick, highlightedClusterIds = [] }, ref) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  
  // Refs para armazenar seleções D3 e permitir updates performáticos
  const nodeRef = useRef<any>(null);
  const linkRef = useRef<any>(null);
  const labelRef = useRef<any>(null);

  const downloadGraphImage = () => {
    if (!svgRef.current) return;
    
    const svgElement = svgRef.current;
    
    // 1. Setup High-DPI Scaling
    const scale = 2; // Exportar em 2x (Retina quality) para nitidez
    const width = svgElement.clientWidth || 800;
    const height = svgElement.clientHeight || 600;

    // 2. Serialize SVG
    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(svgElement);
    
    // Add namespace if missing to ensure valid XML
    if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
        source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    
    // 3. Create Canvas
    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    // 4. Load Image and Draw
    const img = new Image();
    const blob = new Blob([source], {type: "image/svg+xml;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    
    img.onload = () => {
        // Fill background with slate-900 (matches UI container)
        ctx.fillStyle = '#0f172a'; 
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw image scaled
        // Usamos drawImage com dimensões explícitas para forçar o browser a renderizar o SVG vetorizado no tamanho maior
        ctx.drawImage(img, 0, 0, width * scale, height * scale);
        
        // 5. Trigger Download
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const pngUrl = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.href = pngUrl;
        downloadLink.download = `grafo_conhecimento_RAG_${timestamp}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  useImperativeHandle(ref, () => ({
    downloadGraphImage
  }));

  // Effect para atualização visual (Highlight) sem reiniciar simulação
  useEffect(() => {
     if (!nodeRef.current || !linkRef.current || !labelRef.current) return;

     const hasHighlight = highlightedClusterIds.length > 0;

     // Update Nodes opacity
     nodeRef.current.transition().duration(300)
        .style("opacity", (d: any) => {
           if (!hasHighlight) return 1;
           return highlightedClusterIds.includes(d.group) ? 1 : 0.1;
        })
        .style("stroke", (d: any) => {
           if (hasHighlight && highlightedClusterIds.includes(d.group)) return "#fff";
           return null;
        })
        .style("stroke-width", (d: any) => {
             if (hasHighlight && highlightedClusterIds.includes(d.group)) return 2.5;
             return 1.5;
        });

     // Update Links opacity
     linkRef.current.transition().duration(300)
        .style("opacity", (d: any) => {
           if (!hasHighlight) return Math.max(0.2, d.confidence);
           const sourceIn = highlightedClusterIds.includes(d.source.group);
           const targetIn = highlightedClusterIds.includes(d.target.group);
           // Mostrar link se ambos estiverem no highlight, ou se conectar dois clusters destacados
           return (sourceIn && targetIn) ? 0.8 : 0.05;
        });
     
     // Update Labels
     labelRef.current.transition().duration(300)
        .style("opacity", (d: any) => {
           if (!hasHighlight) return 1;
           return highlightedClusterIds.includes(d.group) ? 1 : 0.1;
        });

  }, [highlightedClusterIds]);

  // Effect principal para montar o grafo
  useEffect(() => {
    if (!data || !svgRef.current || !containerRef.current || !tooltipRef.current) return;

    d3.select(svgRef.current).selectAll("*").remove();

    const width = containerRef.current.clientWidth;
    const height = 600;

    const nodes = data.nodes.map(d => ({ ...d }));
    const links = data.links.map(d => ({ ...d }));
    const tooltip = d3.select(tooltipRef.current);

    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    const simulation = d3.forceSimulation(nodes as any)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance((d: any) => 150 - (d.value * 50))) // Stronger links are shorter
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(35));

    const svg = d3.select(svgRef.current)
      .attr("viewBox", [0, 0, width, height])
      .attr("width", width)
      .attr("height", height);

    const g = svg.append("g");
    svg.call(d3.zoom<SVGSVGElement, unknown>().on("zoom", (event) => {
        g.attr("transform", event.transform);
    }));

    // Arrow marker
    svg.append("defs").selectAll("marker")
        .data(["end"])
        .enter().append("marker")
        .attr("id", "arrow")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 25)
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", "#999");

    const link = g.append("g")
      .attr("stroke", "#999")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-opacity", (d: any) => Math.max(0.2, d.confidence)) // Confidence dictates opacity
      .attr("stroke-width", (d: any) => Math.sqrt(d.value) * 3);
    
    linkRef.current = link; // Armazenar ref

    const node = g.append("g")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", (d: any) => 12 + (d.centrality * 20))
      .attr("fill", (d: any) => colorScale(String(d.group)))
      .attr("cursor", "pointer")
      .on("mouseover", (event, d: any) => {
          tooltip.style("opacity", 1);
          tooltip.html(`
             <div class="font-bold text-sm mb-1 text-slate-100 border-b border-slate-600 pb-1">${d.label}</div>
             <div class="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] text-slate-300">
               <span class="opacity-70">Cluster ID:</span> <span class="font-mono text-indigo-300 text-right">${d.group}</span>
               <span class="opacity-70">Centralidade:</span> <span class="font-mono text-emerald-300 text-right">${(d.centrality || 0).toFixed(3)}</span>
               <span class="opacity-70">Tipo:</span> <span class="font-mono text-amber-300 text-right">${d.entityType || 'N/A'}</span>
             </div>
          `);
      })
      .on("mousemove", (event) => {
          const [x, y] = d3.pointer(event, containerRef.current);
          tooltip
            .style("left", (x + 15) + "px")
            .style("top", (y + 15) + "px");
      })
      .on("mouseout", () => {
          tooltip.style("opacity", 0);
      })
      .call((d3.drag() as any)
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));
    
    nodeRef.current = node; // Armazenar ref

    node.on("click", (event, d: any) => {
      onNodeClick(d);
    });

    const labels = g.append("g")
      .selectAll("text")
      .data(nodes)
      .enter()
      .append("text")
      .text((d: any) => d.label)
      .attr("font-size", 10)
      .attr("fill", "#e2e8f0")
      .attr("font-weight", "500")
      .attr("dx", 15)
      .attr("dy", 4)
      .style("pointer-events", "none")
      .style("text-shadow", "1px 1px 2px #000");
    
    labelRef.current = labels; // Armazenar ref

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node
        .attr("cx", (d: any) => d.x)
        .attr("cy", (d: any) => d.y);

      labels
        .attr("x", (d: any) => d.x)
        .attr("y", (d: any) => d.y);
    });

    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }
    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }
    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return () => { simulation.stop(); };
  }, [data, onNodeClick]); // Highlight prop removida daqui para evitar re-render total

  return (
    <div className="relative">
        <div ref={containerRef} className="w-full bg-slate-900 rounded-lg overflow-hidden shadow-inner border border-slate-700 h-[600px]">
          <svg ref={svgRef} className="w-full h-full block" />
        </div>
        
        {/* Tooltip Element */}
        <div 
          ref={tooltipRef}
          className="absolute z-20 bg-slate-800/95 border border-slate-600 rounded-lg shadow-xl p-3 pointer-events-none opacity-0 transition-opacity duration-150 backdrop-blur-sm min-w-[160px]"
          style={{ top: 0, left: 0 }}
        >
          {/* Content filled by D3 */}
        </div>

        <div className="absolute top-4 left-4 bg-slate-800/80 p-2 rounded text-xs text-white border border-slate-600 pointer-events-none">
           <p className="font-bold mb-1">Legenda de Conexões:</p>
           <div className="flex items-center mb-1"><div className="w-4 h-0.5 bg-gray-400 opacity-100 mr-2"></div> Forte Confiança</div>
           <div className="flex items-center"><div className="w-4 h-0.5 bg-gray-400 opacity-30 mr-2"></div> Baixa Confiança</div>
        </div>
    </div>
  );
});

export default ForceGraph;
