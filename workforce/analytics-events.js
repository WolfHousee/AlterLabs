(function () {
  const site = "alterlabs";
  const seenForms = new WeakSet();
  const seenTables = new WeakSet();

  function clean(value) {
    return String(value || "").replace(/\s+/g, " ").trim().slice(0, 160);
  }

  function emit(name, props) {
    const detail = Object.assign({
      event: name,
      site,
      path: location.pathname,
      title: document.title
    }, props || {});

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(detail);

    if (typeof window.posthog?.capture === "function") {
      window.posthog.capture(name, detail);
    }
    if (typeof window.plausible === "function") {
      window.plausible(name, { props: detail });
    }

    document.dispatchEvent(new CustomEvent("alterlabs:event", { detail }));
  }

  window.alterLabsTrack = emit;

  function inferEvent(el) {
    const explicit = el.getAttribute("data-analytics-event");
    if (explicit) return explicit;

    const href = el.getAttribute("href") || "";
    if (href.startsWith("tel:")) return "call_click";
    if (href.includes("wa.me") || href.includes("whatsapp")) return "whatsapp_click";
    if (href.includes("/audit/")) return "audit_page_click";
    if (href.includes("#products") || href.includes("/blog/website-") || href.includes("price")) return "package_compare_open";
    if (location.pathname.startsWith("/blog/") && (href.includes("/services/") || href.includes("/solutions/"))) return "blog_to_service_click";
    if (href.includes("/services/")) return "service_page_cta_click";
    return "";
  }

  document.addEventListener("click", function (event) {
    const el = event.target.closest("a, button");
    if (!el) return;
    const name = inferEvent(el);
    if (!name) return;
    emit(name, {
      label: clean(el.innerText || el.getAttribute("aria-label") || el.getAttribute("title")),
      href: clean(el.getAttribute("href")),
      location_id: clean(el.closest("section, main, header, footer")?.id)
    });
  }, { capture: true });

  document.addEventListener("focusin", function (event) {
    const form = event.target.closest("form");
    if (!form || seenForms.has(form)) return;
    seenForms.add(form);
    emit("audit_form_start", {
      form_id: clean(form.id || form.getAttribute("name")),
      form_label: clean(form.getAttribute("aria-label") || form.querySelector("h2")?.innerText)
    });
  });

  document.addEventListener("submit", function (event) {
    const form = event.target.closest("form");
    if (!form) return;
    emit(form.getAttribute("data-analytics-event") || "audit_form_submit", {
      form_id: clean(form.id || form.getAttribute("name")),
      fields: Array.from(new FormData(form).keys()).join(",")
    });
  }, { capture: true });

  function watchPricingTables() {
    if (!("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.75 && !seenTables.has(entry.target)) {
          seenTables.add(entry.target);
          emit("pricing_table_scroll_75", {
            table_label: clean(entry.target.closest("section")?.querySelector("h2")?.innerText)
          });
        }
      });
    }, { threshold: [0.75] });

    document.querySelectorAll(".pricing-table").forEach(function (table) {
      observer.observe(table);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", watchPricingTables, { once: true });
  } else {
    watchPricingTables();
  }
})();
