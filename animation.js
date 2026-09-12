const animatedMushrooms = document.querySelectorAll(".nav-mushroom, .hero-mushroom");
const animatedPhotos = document.querySelectorAll(
  ".photo-card, .story-image, .product-image, .product-detail-image, .modal-product-image, .promise-photo, img[src*=\"photos/\"]"
);

const addLaunchAnimation = (element, label, animationClass = "photo-launch") => {
  element.setAttribute("role", "button");
  element.setAttribute("tabindex", "0");
  element.setAttribute("aria-label", label);

  const launchElement = () => {
    if (element.classList.contains(animationClass)) return;
    element.classList.add(animationClass);
    element.addEventListener("animationend", () => {
      element.classList.remove(animationClass);
    }, { once: true });
  };

  element.addEventListener("click", launchElement);
  element.addEventListener("pointerup", launchElement);
  element.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      launchElement();
    }
  });
};

animatedMushrooms.forEach((mushroom) => {
  addLaunchAnimation(mushroom, "Faire bondir le champignon", "mushroom-launch");
});

animatedPhotos.forEach((photo, index) => {
  const variant = (index % 4) + 1;
  addLaunchAnimation(photo, "Faire bondir cette photo", `photo-launch-${variant}`);
});
