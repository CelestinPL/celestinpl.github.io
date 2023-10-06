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
    
    render (dataBinding) {
      this.dispose()

      this._echart = echarts.init(this._root)
      this._echart.setOption({
        graphic: {
          elements: [
            {
              type: 'text',
              left: 'center',
              top: 'center',
              style: {
                text: '',
                fontSize: 0,
                fontFamily: 'cursive',
                fontWeight: 'bold',
                lineDash: [0, 200],
                lineDashOffset: 0,
                fill: 'transparent',
                stroke: '#C85611',
                lineWidth: 0
              }
            }
          ]
        }
      })
    }

    dispose () {
      if (this._echart) {
        echarts.dispose(this._echart)
      }
    }
  }
  
  class TitleMain extends HTMLElement {
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

  customElements.define('com-senfiniti-sac-echarts-title', TitleMain);
})();
