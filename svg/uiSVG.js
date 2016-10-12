/**
 *  @author		Ondrej Benda
 *  @date		2011-2016
 *  @copyright	GNU GPLv3
 *	@brief		Handles most SVG-based UI elements (embedded in the edited SVG file)
 */
function uiSVG() {
	this.selectionBox = new selectionBox();
	this.highligh = null;
    this.frame = new canvasFrame();
		
	this.anchorContainer = null;
	this.highlightContainer = null;
	
	this.target = null;
	
	this.selected = [];
	this.selectedIndexes = [];
	this.allSelected = false;
	
    this.anchors = [];
	
	this.container = null;
	
	this.threshold = 0.01;
}

uiSVG.prototype.toggleSelect = function(target) {
	if(target.selected) {
		this.removeSelect(target);
	} else {
		this.addSelect(target);
	}
}

uiSVG.prototype.addSelect = function(target) {
	if(!target.selectable) { return; }
	for(var i = 0; i < this.anchorContainer.children.length; i++) {
		if(this.anchorContainer.children[i] == target.container) {
			this.selectedIndexes.push(i);
			this.selectedIndexes.sort();
			this.selected.push(target);
			target.select(true);
			break;
		}
	}
}

uiSVG.prototype.removeSelect = function(target) {
	for(var i = 0; i < this.anchorContainer.children.length; i++) {
		if(this.anchorContainer.children[i] == target.container) {
			this.selectedIndexes.splice(this.selectedIndexes.indexOf(i), 1);
			var index = this.selected.indexOf(target);
			if(index >= 0) {
				this.selected.splice(this.selected.indexOf(target), 1);
			}
			target.select(false);
			break;
		}
	}
	this.allSelected = false;
}

uiSVG.prototype.clearSelect = function() {
	for(var i = 0; i < this.selected.length; i++) {
		this.selected[i].select(false);
	}
	this.selected = [];
	this.selectedIndexes = [];
	this.allSelected = false;
}

uiSVG.prototype.selectAll = function() {
	this.clearSelect();
	for(var i = 0; i < this.anchorContainer.children.length; i++) {
		if(this.anchorContainer.children[i].shepherd && this.anchorContainer.children[i].shepherd.selectable) {
			this.selectedIndexes.push(i);
		}
	}
	this.allSelected = true;
	this.edit(svg.selected);
}

uiSVG.prototype.rebuildSelect = function(soft) {
	if(!soft) {
		for(var i = 0; i < this.anchorContainer.children.length; i++) {
			this.anchorContainer.children[i].select(false);
		}
	}
	this.selected = [];
	for(var i = 0; i < this.selectedIndexes.length; i++) {
		if(this.anchorContainer.children[this.selectedIndexes[i]] && this.anchorContainer.children[this.selectedIndexes[i]].shepherd) {
			this.anchorContainer.children[this.selectedIndexes[i]].shepherd.select(true);
			this.selected.push(this.anchorContainer.children[this.selectedIndexes[i]].shepherd);
		}
	}
}

uiSVG.prototype.putOnTop = function() {
	if(!this.container || !this.container.parentNode) { return; }
	if(svg.camera) { svg.svgElement.appendChild(svg.camera.element); }
	this.container.parentNode.appendChild(this.container);
}

// adds an anchor to the UI group
uiSVG.prototype.addAnchor = function(anchor, anchorGroup) {
	if(this.anchors[anchorGroup] == null) { this.anchors[anchorGroup] = []; }
	this.anchors[anchorGroup].push(anchor);
	this.anchorContainer.appendChild(anchor.container || anchor);
}

// removes anchor from the UI group
uiSVG.prototype.removeAnchor = function(anchor, anchorGroup) {
	if(!this.anchors[anchorGroup]) { return; }
	anchor.delete();
	
	var i = this.anchors[anchorGroup].indexOf(anchor);
	if(i != -1) {
		this.anchors[anchorGroup].splice(i, 1);
	}
}

uiSVG.prototype.clearAnchors = function() {
	this.anchors = [];
	
	this.anchorContainer.removeChildren();
	this.anchorContainer.removeAttribute('transform');
}

uiSVG.prototype.setAnchorOffset = function(x, y) {
	if(x == null || y == null) { return; }
	this.anchorContainer.setAttribute('transform', 'translate('+x+', '+y+')');
}

// removes anchors with (nearly) equal locations, condensing them into a single anchor
uiSVG.prototype.condenseAnchors = function(anchorGroup) {
	if(!this.anchors[anchorGroup]) { return; }
	
	var lastAnchor = null;
	var removeList = [];
	
	for(var i = 0; i < this.anchors[anchorGroup].length; i++) {
		if(!lastAnchor) {
			lastAnchor = this.anchors[anchorGroup][i];
			continue;
		}
		
		var currentCandidate = this.anchors[anchorGroup][i];
		
		if(	Math.abs(lastAnchor.x - currentCandidate.x) < this.threshold && 
			Math.abs(lastAnchor.y - currentCandidate.y) < this.threshold	) {
			if(!lastAnchor.actions) { this.anchors[anchorGroup][0].actions = {}; }
			
			removeList.push(currentCandidate);
			
			if(currentCandidate.actions) {
				if(!lastAnchor.actions.move) {
					lastAnchor.actions.move = currentCandidate.actions.move;
				} else {
					lastAnchor.actions.move += currentCandidate.actions.move;
				}
			}
			
			if(currentCandidate.bound) {
				if(!lastAnchor.bound) {
					lastAnchor.bound = currentCandidate.bound;
				} else {
					for(var j in currentCandidate.bound) {
						if(j == 'local') { continue; }
						if(!lastAnchor.bound[j]) {
							lastAnchor.bound[j] = currentCandidate.bound[j];
						} else if(lastAnchor.bound[j].isContainer) {
							if(currentCandidate.bound[j].isContainer) {
								for(var k in currentCandidate.bound[j]) {
									lastAnchor.bound[j][k] = currentCandidate.bound[j][k];
									switch(j) {
										case 'handles':
										case 'circles':
											if(lastAnchor.bound[j][k].center == currentCandidate) {
												lastAnchor.bound[j][k].center = lastAnchor;
											}
											break;
										case 'slaves':
										case 'slavesX':
										case 'slavesY':
										case 'slavesA':
										case 'slavesB':
										case 'slavesXY':
											if(lastAnchor.bound[j][k].pointA == currentCandidate) {
												lastAnchor.bound[j][k].pointA = lastAnchor;
											}
											if(lastAnchor.bound[j][k].pointB == currentCandidate) {
												lastAnchor.bound[j][k].pointB = lastAnchor;
											}
											break;
									}
								}
							}
						} else {
							lastAnchor.bound[j] = currentCandidate.bound[j];
						}
					}
				}
			}
		} else {
			lastAnchor = currentCandidate;
		}
		
		if(i == this.anchors[anchorGroup].length-1) {
			var firstAnchor = this.anchors[anchorGroup][0];
			
			if(firstAnchor == lastAnchor) { continue; }
			if(	Math.abs(firstAnchor.x - lastAnchor.x) < this.threshold && 
			Math.abs(firstAnchor.y - lastAnchor.y) < this.threshold	) {
				if(!firstAnchor.actions) { firstAnchor.actions = {}; }
				
				removeList.push(lastAnchor);
				
				if(lastAnchor.actions) {
					if(!firstAnchor.actions.move) {
						firstAnchor.actions.move = lastAnchor.actions.move;
					} else {
						firstAnchor.actions.move += lastAnchor.actions.move;
					}
				}
				
				if(lastAnchor.bound) {
					if(!firstAnchor.bound) {
						firstAnchor.bound = lastAnchor.bound;
					} else {
						for(var j in lastAnchor.bound) {
							if(j == 'local') { continue; }
							if(!firstAnchor.bound[j]) {
								firstAnchor.bound[j] = lastAnchor.bound[j];
							} else if(lastAnchor.bound[j].isContainer) {
								if(firstAnchor.bound[j].isContainer) {
									for(var k in lastAnchor.bound[j]) {
										firstAnchor.bound[j][k] = lastAnchor.bound[j][k];
										switch(j) {
											case 'handles':
											case 'handlesX':
											case 'handlesY':
											case 'circles':
												if(firstAnchor.bound[j][k].center == lastAnchor) {
													firstAnchor.bound[j][k].center = firstAnchor;
												}
												break;
											case 'slaves':
											case 'slavesX':
											case 'slavesY':
											case 'slavesA':
											case 'slavesB':
											case 'slavesXY':
												if(firstAnchor.bound[j][k].pointA == lastAnchor) {
													firstAnchor.bound[j][k].pointA = firstAnchor;
												}
												if(firstAnchor.bound[j][k].pointB == lastAnchor) {
													firstAnchor.bound[j][k].pointB = firstAnchor;
												}
												break;
										}
									}
								}
							} else {
								firstAnchor.bound[j] = lastAnchor.bound[j];
							}
						}
					}
				}
				
				break;
			}
		}
	}
	
	for(var i = 0; i < removeList.length; i++) {
		this.removeAnchor(removeList[i], anchorGroup);
	}
}

uiSVG.prototype.refresh = function() {
	this.putOnTop();
	this.frame.refresh();
	if(svg.camera) { svg.camera.adjustZoom(); }
	this.selectionBox.adjustZoom();
	this.highlight.adjustZoom();
	if(svg.camera) { svg.camera.adjustZoom(); }
	for(var i in this.anchors) {
		for(var j = 0; j < this.anchors[i].length; j++) {
			if(typeof this.anchors[i][j].adjustZoom === 'function') {
				this.anchors[i][j].adjustZoom();
			}
		}
	}
}

uiSVG.prototype.setContainer = function(container) {
	this.container = container;
	this.container.removeChildren();
	this.container.appendChild(this.selectionBox.container);
	this.container.appendChild(this.frame.container);
	this.highlight = new highlight();
	this.container.appendChild(this.highlight.container);
	
	this.anchorContainer = document.createElementNS(svgNS, "g");
	this.container.appendChild(this.anchorContainer);
}

uiSVG.prototype.edit = function(target) {
	this.selectionBox.hide();
	this.highlight.hide();
	this.clearAnchors();
	
	if(target && target.shepherd) {
		target = target.shepherd;
	}
	
	if(this.target != target || target == null) {
		this.clearSelect();
	}
	
	this.target = target;
	
	this.highlight.setElement(target.element || target);
	this.selectionBox.setElement(target.element || target);
	
	if(!(target instanceof animationGroup) && (target instanceof SVGSVGElement || target instanceof SVGGElement && target.getAttribute('inkscape:groupmode') == 'layer'
		|| target instanceof SVGAnimationElement)) {
		this.selectionBox.hide();
	}
	
	if(!target || !(typeof target.generateAnchors === 'function')) { return; }
	var anchorData;
	
	anchorData = target.generateAnchors();
	
	if(!anchorData) { return; }
	
	if(anigenActual.settings.get('nodes')) {
		this.anchorContainer.removeAttribute("display");
	} else {
		this.anchorContainer.setAttribute("display", "none");
	}
	
	if(anchorData.connectors) {
		for(var i = 0; i < anchorData.connectors.length; i++) {
			this.addAnchor(anchorData.connectors[i], 0);
		}
	}
	
	if(anchorData.paths) {
		for(var i = 0; i < anchorData.paths.length; i++) {
			this.addAnchor(anchorData.paths[i], 1);
		}
	}
	
	if(anchorData.anchors) {
		for(var i = 0; i < anchorData.anchors.length; i++) {
			for(var j = 0; j < anchorData.anchors[i].length; j++) {
				this.addAnchor(anchorData.anchors[i][j], 2+i);
			}
		}
	}
	
	this.rebuildSelect(true);
}