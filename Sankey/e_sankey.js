var getScriptPromisify = (src) => {
  // Workaround with conflict between geo widget and echarts.
  
  return new Promise(resolve => {
    $.getScript(src, () => {
      resolve()
    })
  })
}

(function() {
  const template = document.createElement('template');
  template.innerHTML = `
    <style>
      :host > #chart {
        width: 100%;
        height: 100%;
      }
    </style>
    <div id="root" style="width: 100%; height: 100%;">
      <div id="chart"></div>
    </div>
  `;
    
  class Renderer {
    constructor (root) {
      this._root = root
      this._echart = null
    }

    parseMetadata (metadata) {
      const { dimensions: dimensionsMap, mainStructureMembers: measuresMap } = metadata
      const dimensions = []
      for (const key in dimensionsMap) {
        const dimension = dimensionsMap[key]
        dimensions.push({ key, ...dimension })
      }
      const measures = []
      for (const key in measuresMap) {
        const measure = measuresMap[key]
        measures.push({ key, ...measure })
      }
      return { dimensions, measures, dimensionsMap, measuresMap }
    }
    
    render (dataBinding) {
      this.dispose()

      if (dataBinding.state !== 'success') { return }

      let { data, metadata } = dataBinding
      const { dimensions, measures } = this.parseMetadata(metadata)

      const [source, target] = dimensions
      const [measure, prevmeasure] = measures
      const nodes = []
      const links = []

      data.forEach(d => {
        const parentLabel = d[source.key]['label']
        const parentId = d[source.key]['id']
        const { label, id } = d[target.key]
        const { raw } = d[measure.key]
        let prevraw = 0;
        if (prevmeasure != undefined){
          prevraw = d[prevmeasure.key]['raw'];
        }          
        const nIndex = nodes.findIndex(object => object.name === label)
        if (nIndex === -1) { 
          nodes.push({ name: label, param1: prevraw, param2: 0 }) 
        }
        else {
          nodes[nIndex]['param1'] += prevraw;
        }

        const pIndex = nodes.findIndex(object => object.name === parentLabel)
        if (pIndex === -1) { 
          nodes.push({ name: parentLabel, param1: 0, param2: prevraw }) 
        }
        else {
          nodes[pIndex]['param2'] += prevraw;
        }
        links.push({
          source: parentLabel,
          target: label,
          value: raw
        })
      })

      nodes.forEach(n => {
        if (n.param1 >= n.param2){
          delete n.param2;
        }
        else {
          n.param1 = n.param2;
          delete n.param2;
        }
      })
      
      this._echart = echarts.init(this._root)
      this._echart.setOption({
        title: {
          text: 'Sankey Diagram'
        },
        tooltip: {
          trigger: 'item',
          triggerOn: 'mousemove'
        },
        series: [
          {
            type: 'sankey',
            data: nodes,
            links: links,
            emphasis: {
              focus: 'adjacency'
            },
            lineStyle: {
              color: 'gradient',
              curveness: 0.5
            },
            edgeLabel: {
              show: false
            },
            label: {
              show: true,
              formatter: function(d) {
                let p = 0, v = d.value, m='';
                if (d.data.hasOwnProperty("param1") && typeof(d.data.param1) == 'number')
                {
                  if (d.data.param1 != 0)
                  {
                    p = ((d.value - d.data.param1) * 100 / d.data.param1).toFixed(2);
                  }
                }
                if (v > 1000000000)
                {
                  v = (v / 1000000000).toFixed(2);
                  m = ' B'
                } 
                else if (v > 1000000)
                {
                  v = (v / 1000000).toFixed(2);
                  m = ' M'
                }
                else if (v > 1000)
                {
                  v = (v / 1000).toFixed(2);
                  m = ' K'
                }
                else
                {
                  v = v.toFixed(2);
                }
                return "{i|" + d.name + ": }"
                  + "{b|" + v + m + "}"
                  + (p > 0 ? "{g|   +" + p + "%}" : "")
                  + (p < 0 ? "{r|   " + p + "%}" : "");
              },
                  
              rich: {
                i: {
                    color: 'inherit',
                    fontWeight: 'bold'
                },
                r: {
                    color: 'red',
                    fontWeight: 'bold'
                },
                g: {
                    color: 'green',
                    fontWeight: 'bold'
                },
                b: {
                    color: 'blue',
                    fontWeight: 'bold'
                }
              }
            }
          }
        ]
      })
    }

    dispose () {
      if (this._echart) {
        echarts.dispose(this._echart)
      }
    }
  }
  
  class SankeyMain extends HTMLElement {
    constructor () {
      super();

      this._shadowRoot = this.attachShadow({ mode: 'open' });
      this._shadowRoot.appendChild(template.content.cloneNode(true));
      this._root = this._shadowRoot.getElementById('root');
      this._renderer = new Renderer(this._root);
    }

    // ------------------
    // LifecycleCallbacks
    // ------------------
    async onCustomWidgetBeforeUpdate (changedProps) {
    }

    async onCustomWidgetAfterUpdate (changedProps) {
      this.render();
    }

    async onCustomWidgetResize (width, height) {
      this.render();
    }

    async onCustomWidgetDestroy () {
      this.dispose();
    }

    async render () {
      await getScriptPromisify('https://fastly.jsdelivr.net/npm/echarts@5/dist/echarts.min.js')
      
      if (!document.contains(this)) {
        // Delay the render to assure the custom widget is appended on dom
        setTimeout(this.render.bind(this), 0);
        return;
      }
      
      this._renderer.render(this.dataBinding);
    }

    dispose () {
      this._renderer.dispose();
    }
  }

  customElements.define('com-senfiniti-sac-echarts-sankey', SankeyMain);
})();
