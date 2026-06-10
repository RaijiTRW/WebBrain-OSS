const contactButton = document.querySelector("#contactButton");

if (contactButton) {
  contactButton.addEventListener("click", () => {
    contactButton.classList.add("is-clicked");
    contactButton.textContent = "Черновик готов";

    window.setTimeout(() => {
      contactButton.classList.remove("is-clicked");
    }, 180);
  });
}
