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

      const [source, target, category] = dimensions
      const [measure] = measures
      const nodes = []
      const links = []
      const categories = []

      data.forEach(d => {
        const sourceLabel = d[source.key]['label']
        const sourceId = d[source.key]['id']
        const targetLabel = d[target.key]['label']
        const targetId = d[target.key]['id']
        const categoryLabel = d[category.key]['label']
        const categoryId = d[category.key]['id']
        const { raw } = d[measure.key]
        const nIndex = nodes.findIndex(object => object.name === targetLabel)
        if (nIndex === -1) { 
          nodes.push({ 
            name: targetLabel,
            value: categoryLabel
          }) 
        }

        const pIndex = nodes.findIndex(object => object.name === sourceLabel)
        if (pIndex === -1) { 
          nodes.push({ 
            name: sourceLabel,
            value: categoryLabel
          })
        }
        links.push({
          source: sourceLabel,
          target: targetLabel,
          value: raw
        })
      })
      
      this._echart = echarts.init(this._root)
      this._echart.setOption({
        tooltip: {},
        legend: [
          {
            data: categories.map(function (a) {
              return a.name;
            })
          }
        ],
        series: [
          {
            type: 'graph',
            layout: 'force',
            data: nodes,
            links: links,
            categories: categories,
            roam: true,
            label: {
              show: true,
              position: 'right',
              formatter: '{b}'
            },
            force: {
              repulsion: 100
            }
            labelLayout: {
              hideOverlap: true
            },
            scaleLimit: {
              min: 0.4,
              max: 2
            },
            lineStyle: {
              color: 'source',
              curveness: 0.3
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
  
  class GraphMain extends HTMLElement {
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

  customElements.define('com-senfiniti-sac-echarts-graph', GraphMain);
})();
