import * as d3 from 'd3';

class Coordinates {
    constructor(input) {
        this.x = input.x;
        this.y = input.y;
    }

    static flip(coordinates) {
        //noinspection JSSuspiciousNameCombination
        const old = new Coordinates(coordinates);
        coordinates.x = old.y;
        coordinates.y = old.x;
    }
}

export default class {
    constructor({svg, organizationJson,　imageRadius = 30, expanseDirection = "vertical", animationDuration = 750}) {
        this.svg = svg;
        this.nodeRadius = imageRadius;
        const svgGroup = svg.append('g').call(translate, {x:this.nodeRadius, y:this.nodeRadius});
        this.linkGroup = svgGroup.append('g').attr('class', 'links');
        this.nodeGroup = svgGroup.append('g').attr('class', 'nodes');
        this.hierarchyRoot = d3.hierarchy(organizationJson, d => d.children);
        this._layOutTree()
        const originCoordinates = new Coordinates(this.hierarchyRoot);
        this.hierarchyRoot.descendants().forEach( node => node.lastPosition = new Coordinates(originCoordinates) );
        this._expanseDirection = expanseDirection;
        this.animationDuration = animationDuration;
        this.update(this.hierarchyRoot);
    }

    _layOutTree() {
        // Lays out the hierarchy by creating coordinates for each node.
        const treeLayout = d3.tree().size([this.svg.attr('width')-this.nodeRadius*2, this.svg.attr('height')-this.nodeRadius*4]);
        const treeRoot = treeLayout(this.hierarchyRoot);
        if (this._expanseDirection == 'horizontal') treeRoot.descendants().forEach(Coordinates.flip);
        return treeRoot;
    }

    update(changedNode) {

        const treeRoot = this._layOutTree()

        // Flatten the hierarchy for processing
        const treeNodes = treeRoot.descendants();
        const treeLinkTargets = treeRoot.descendants().slice(1);

        // *************** Links section ****************

        // Update the links…
        const link = this.linkGroup.selectAll("path.link")
            .data(treeLinkTargets);

        // Enter any new links at the parent's previous position.
        const enterLink = link
            .enter()
            .append("path")
            .attr("class", "link")
            .attr("d", () => diagonal({
                startPoint: changedNode.lastPosition,
                endPoint: changedNode.lastPosition,
                expanseDirection: this._expanseDirection
            }));

        link.merge(enterLink)
            .transition()
            .duration(this.animationDuration)
            .attr("d", node => diagonal({
                startPoint: node,
                endPoint: node.parent,
                expanseDirection: this._expanseDirection
            }));

        link.exit()
            .transition()
            .duration(this.animationDuration)
            .attr("d", () => diagonal({
                startPoint: changedNode,
                endPoint: changedNode,
                expanseDirection: this._expanseDirection
            }))
            .remove();

        // *************** Nodes section ****************

        // Update the nodes…
        const node = this.nodeGroup.selectAll("g.node")
            .data(treeNodes);

        // Enter any new nodes at the parent's previous position.
        const nodeEnter = node.enter()
            .append("g")
            .attr("class", "node")
            .on("click", click(this))
            .call(appendGraphic)
            .call(appendLabel, this.nodeRadius)
            .call(closedNodeDesign, {closedAtCoordinates: changedNode.lastPosition});

        // Transition nodes to their new position.
        node.merge(nodeEnter).transition()
            .duration(this.animationDuration)
            .call(openNodeDesign, this.nodeRadius);

        // Transition exiting nodes to the parent's new position.
        const nodeExit = node.exit()
            .transition()
            .duration(this.animationDuration)
            .call(closedNodeDesign, {closedAtCoordinates: changedNode})
            .remove();

        // Stash the old positions for transition.
        treeNodes.forEach( d => d.lastPosition = new Coordinates(d) );

        return nodeExit;
    }
}

// Creates a curved (diagonal) path from parent to the child nodes
function diagonal({startPoint, endPoint, expanseDirection}) {
    const controlPointX = expanseDirection == "horizontal" ? () => (startPoint.x + endPoint.x) / 2 : (point) => point.x;
    const controlPointY = expanseDirection == "vertical" ? () => (startPoint.y + endPoint.y) / 2 : (point) => point.y;
    return `M ${startPoint.x} ${startPoint.y}
            C ${controlPointX(startPoint)} ${controlPointY(startPoint)},
              ${controlPointX(endPoint)} ${controlPointY(endPoint)},
              ${endPoint.x} ${endPoint.y}`
}

function translate(selection, coordinates) {
    const transform = d3.zoomIdentity.translate(coordinates.x, coordinates.y);
    selection.attr('transform', transform);
}

function appendGraphic(selection) {
    // Thanks to http://stackoverflow.com/questions/22883994/crop-to-fit-an-svg-pattern

    const graphicGroup = selection
        .append('g')
        .attr('class', 'graphic');

    graphicGroup.append('defs')
        .append('pattern')
        .attr('id', d => 'pic_' + d.data.fname + d.data.lname)
        .attr('height', '100%')
        .attr('width', '100%')
        .attr('patternContentUnits', 'objectBoundingBox')
        .attr('viewBox', '0 0 1 1')
        .attr('preserveAspectRatio', "xMidYMid slice")
        .append('image')
        .attr('xlink:href', d => d.data.photo)
        .attr('height', '1')
        .attr('width', '1')
        .attr('preserveAspectRatio', "xMidYMid slice");

    graphicGroup.append("circle")
        .attr('fill', d => 'url(#pic_' + d.data.fname + d.data.lname + ')');
}

function appendLabel(selection, nodeRadius) {
    const labelGroup = selection.append('g')
        .attr('class', 'label')
        .attr("transform", d => {
            const labelOffset = {
                x: (d.children || d.hiddenChildren ? -1 : 1) * (nodeRadius + 5),
                y: 0
            };
            return d3.zoomIdentity.translate(labelOffset.x, labelOffset.y);
        });

    labelGroup.append("text")
        .attr("dy", "1em")
        .attr("text-anchor", d => d.children || d.hiddenChildren ? "end" : "start")
        .text(d => d.data.fname + " " + d.data.lname);

    labelGroup.append("text")
        .attr("dy", "2.15em")
        .attr("text-anchor", d => d.children || d.hiddenChildren ? "end" : "start")
        .text(d => d.data.title)
}

// *** Transition helpers ***

function closedNodeDesign(selection, {closedAtCoordinates}) {
    selection
        .call(translate, closedAtCoordinates);

    selection.selectAll('circle')
        .attr('r', 0);

    selection.select('g.label')
        .attr('opacity', 0);
}
function openNodeDesign(selection, nodeRadius) {
    selection
        .attr("transform", d => d3.zoomIdentity.translate(d.x, d.y));

    selection.selectAll('circle')
        .attr("r", nodeRadius);

    selection.select("g.label")
        .attr("opacity", 1);

}

function click(chart) {
    return d => {
        if (d.children) {
            d.hiddenChildren = d.children;
            d.children = null;
        } else {
            d.children = d.hiddenChildren;
            d.hiddenChildren = null;
        }
        chart.update(d);
    }
}