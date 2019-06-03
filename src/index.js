
import Slider from './components/Slider.vue'

function install (Vue) {
  if (install.installed) return
  install.installed = true
  Vue.component('vue-app-slider', Slider)
}

const VueAppSlider = {
  install: install,
  Slider
}

if (typeof window !== undefined && window.Vue) {
  window.Vue.use(VueAppSlider)
}

export default VueAppSlider
