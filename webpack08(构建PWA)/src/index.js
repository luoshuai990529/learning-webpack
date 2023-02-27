import Vue from "vue";
import App from "./App.vue";
import { register } from "register-service-worker";

Vue.config.productionTip = false;
console.log("test");

register("/service-worker.js", {
  registrationOptions: { scope: "./" },
  ready() {
    console.log("Service worker is active.");
  },
  registered() {
    console.log("Service worker has been registered.");
  },
  cached() {
    console.log("Content has been cached for offline use.");
  },
  updatefound(registration) {
    console.log("New content is downloading.");
  },
  updated(registration) {
    console.log("New content is available; please refresh.");
  },
  offline() {
    console.log(
      "No internet connection found. App is running in offline mode."
    );
  },
  error(error) {
    console.error("Error during service worker registration:", error);
  },
});

new Vue({
  render: (h) => h(App),
}).$mount("#app");
