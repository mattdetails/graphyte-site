/*
 * Graphyte logo tooltips
 * Names each logo in the home page's "Tools I build with" row: a tooltip on hover (styled in
 * custom.css to match the design system's Tooltip) and alt text for screen readers.
 *
 * Relume's logo list only holds images, so the names live here, keyed by each logo's asset id
 * (the /assets/<id> in its src). Reordering logos in Relume keeps the right names. A logo that is
 * swapped or added shows no tooltip until its id is added below.
 *
 * Head code:
 *   <script src="https://cdn.jsdelivr.net/gh/mattdetails/graphyte-site@v1.0.8/logo-tooltips.js" defer></script>
 */
(function () {
  var NAMES = {
    '89f8a652-a0ac-47cb-8579-6f1c31b547dd': 'Webflow',
    '57dd4f5c-af8e-4c08-9aa0-cb18641d66f9': 'Relume',
    'b6007c23-59df-47a7-8301-0a971e794ae4': 'Framer',
    '8c4c4415-b746-485c-9421-3e80a1b49517': 'Astro',
    '9b071d04-bee9-4830-a109-957adfef78cf': 'React',
    '71ea56f3-cfab-47e5-b9da-6eb2aefdfe34': 'Sanity',
    '124eb5b3-36ad-40d9-9080-0b85e0ac6c58': 'Claude',
    '6605ea75-86e3-4168-aa19-513cf90aa47e': 'FlutterFlow',
    '58981f05-bb27-4dc2-af8d-6c87c2b3f9d9': 'Notion',
    'a2372d93-9135-4e9e-bd53-0da172ab5ffc': 'Make'
  };

  function label() {
    var imgs = document.querySelectorAll('.customer-logo-wrapper img');
    for (var i = 0; i < imgs.length; i++) {
      var m = (imgs[i].getAttribute('src') || '').match(/\/assets\/([0-9a-f-]{36})/i);
      var name = m && NAMES[m[1].toLowerCase()];
      if (!name) continue;
      imgs[i].alt = name;
      imgs[i].parentElement.setAttribute('data-gr-tooltip', name);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', label);
  else label();
})();
