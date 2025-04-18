document.addEventListener('DOMContentLoaded', async () => {
    const translations = {
        button_remove: {
            fr: "supprimer",
            en: 'remove'
        },
        button_detail: {
            fr: "revoir l'article",
            en: 'item detail'
        },
        button_add_qty: {
            fr: 'augmenter la quantité',
            en: 'increase the quantity'
        },
        button_remove_qty: {
            fr: 'diminuer la quantité',
            en: 'reduce the quantity'
        },
        quantity: {
            fr: 'quantité',
            en: 'quantity'
        }
    }

    storage.getCountry = () => localStorage.getItem('shop11ty_country') || 'FR',
        storage.setCountry = (country) => {
            localStorage.setItem('shop11ty_country', country)
        }

    const sectionCart = document.getElementById('cart')
    const sectionNoCart = document.getElementById('no-cart')
    const cartContent = document.getElementById('cart-content')
    const shippingSelect = document.getElementById('destination')
    const subtotalElement = document.querySelector('.subtotal-amount')
    const shippingElement = document.querySelector('.shipping-amount')
    const totalElement = document.querySelector('.total-amount')
    const checkoutButton = document.getElementById('checkout-button')
    const fullscreenLoader = document.getElementById('fullscreen-loader')
    const successPayment = document.getElementById('payment-successed')

    const CURRENT_LANG = getActiveLanguage()

    const productsData = await fetchProductsData()

    let totalShippingCost = 0;

    initialize()

    async function initialize() {
        successPayment && resetCartForSuccessPayment()
        checkoutButton && checkoutButtonEventListener()

        if (sectionCart && sectionNoCart) {
            if (shippingSelect) {
                setSelectedCountry()
                shippingSelect.addEventListener('change', () => {
                    const selectedCountryIso = shippingSelect.selectedOptions[0].getAttribute('data-iso')
                    storage.setCountry(selectedCountryIso)
                    calculateCartTotal()
                })
            }
            updateCartVisibility()

            if (storage.getCart().length !== 0) {
                initializeCart()
            }
        }
    }

    function t(key) {
        return translations[key]?.[CURRENT_LANG] || key
    }

    function resetCartForSuccessPayment() {
        storage.setCart([])
    }

    async function fetchProductsData() {
        try {
            const response = await fetch(`/products.json`)
            if (!response.ok) {
                throw new Error('Network response was not ok')
            }
            return await response.json()
        } catch (error) {
            console.error('Erreur lors du chargement des données produits :', error)
            return []
        }
    }

    function initializeCart() {
        const cartItems = storage.getCart()
        cartItems.forEach((cartItem) => {
            const productData = productsData.find((product) => String(product.id) === String(cartItem.id))
            if (productData) {
                const itemElement = createCartItemElement(productData, cartItem)
                cartContent.appendChild(itemElement)
            }
        })

        cartContent.addEventListener('click', handleCartContentClick)
        cartContent.addEventListener('change', handleCartContentChange)

        calculateCartTotal()
    }

    function handleCartContentClick(event) {
        const target = event.target

        if (target.classList.contains('remove-from-cart')) {
            event.preventDefault()
            removeFromCart(target.dataset.id)
        } else if (target.classList.contains('qty-count')) {
            handleButtonQuantityChange(target)
        }
    }

    function handleCartContentChange(event) {
        if (event.target.classList.contains('item-qty')) {
            updateQuantity(event.target)
        }
    }

    function formatPrice(price) {
        const priceFixed = parseFloat(price).toFixed(2)
        return (CURRENT_LANG === "fr") ? priceFixed.replace('.', ',') : priceFixed
    }

    function createCartItemElement(productData, cartItem) {
        const itemElement = document.createElement('article')
        const imageName = productData.image.replace(/\.[^/.]+$/, '')
        itemElement.classList.add('item')
        itemElement.classList.add('shadow')
        itemElement.innerHTML = `
            <header class="item-header">
                <h2 class="item-title">${productData.title[CURRENT_LANG]}</h2>
            </header>
            <figure class="item-figure">
               <img class="item-image" alt="image - ${productData.title[CURRENT_LANG]}" loading="lazy" decoding="async" src="/img/${imageName}-365w.webp" width="365" height="242" srcset="/img/${imageName}-365w.webp" sizes="365px">
            </figure>
            <section class="item-details">
                <data class="price" value="${productData.price}" itemprop="price">
                    ${formatPrice(productData.price)} €
                </data>
                <meta itemprop="priceCurrency" content="EUR" >
                <div class="qty-input">
                    <button class="qty-count qty-count--minus ${cartItem.qty === 1 ? 'disabled' : ''}" data-action="minus" type="button" aria-label="${t('button_remove_qty')}">
                        -
                    </button>
                    <label for="qty-${cartItem.id}" class="display-none">${t('quantity')}</label>
                    <input id="qty-${cartItem.id}" class="item-qty item-qty" type="number" name="item-qty" data-id="${cartItem.id}" min="1" max="${productData.stock || 10}" value="${cartItem.qty}" >
                    <button class="qty-count qty-count--add ${cartItem.qty === +productData.stock ? 'disabled' : ''}" data-action="add" type="button" aria-label="${t('button_add_qty')}">
                        +
                    </button>
                </div>
                <data class="item-total-price price" value="${productData.price * cartItem.qty}" itemprop="price">
                    ${formatPrice(productData.price * cartItem.qty)} €
                </data>
                <meta itemprop="priceCurrency" content="EUR" >
            </section>
            <footer class="item-footer">
                <a href="${productData.permalinks[CURRENT_LANG]}" class="btn btn-details" aria-label="${t('button_detail')}">
                    ${t('button_detail')}
                </a>
                <a href="#!" class="btn btn-card remove-from-cart" data-id="${cartItem.id}" aria-label="${t('button_remove')}">
                    ${t('button_remove')}
                </a>
            </footer>`
        return itemElement
    }

    function updateQuantity(input, delta = 0) {
        const productId = input.dataset.id
        let newQty = parseInt(input.value) + delta
        const min = parseInt(input.min)
        const max = parseInt(input.max)

        newQty = Math.min(Math.max(newQty, min), max)
        input.value = newQty

        updateCartItemQuantity(productId, newQty)
        updateItemTotalPrice(productId, newQty)
        updateButtonState(productId, newQty, min, max)
    }

    function handleButtonQuantityChange(button) {
        const input = button.closest('.qty-input').querySelector('.item-qty')
        const delta = button.dataset.action === 'add' ? 1 : -1
        updateQuantity(input, delta)
    }

    function removeFromCart(productId) {
        let cart = storage.getCart()
        cart = cart.filter((item) => item.id !== productId)
        storage.setCart(cart)

        const qtyInput = document.querySelector(`#qty-${productId}`)
        if (qtyInput) {
            const itemElement = qtyInput.closest('.item')
            if (itemElement) {
                itemElement.remove()
            }
        }

        calculateCartTotal()
        updateCartLink()
        updateCartVisibility()
    }

    function updateCartItemQuantity(productId, newQty) {
        let cart = storage.getCart()
        cart = cart.map((item) => item.id === productId ? { ...item, qty: newQty } : item)
        storage.setCart(cart)
        calculateCartTotal()
        updateCartLink()
    }

    function updateItemTotalPrice(productId, newQty) {
        const productData = productsData.find((product) => String(product.id) === String(productId))
        if (productData) {
            const qtyInput = document.querySelector(`#qty-${productId}`)
            if (qtyInput) {
                const itemTotalElement = qtyInput.closest('.item-details').querySelector('.item-total-price')
                if (itemTotalElement) {
                    const itemTotal = productData.price * newQty
                    itemTotalElement.textContent = `${formatPrice(itemTotal)} €`
                }
            }
        }
    }

    function updateButtonState(productId, currentQty, min, max) {
        const qtyInput = document.querySelector(`#qty-${productId}`)
        if (qtyInput) {
            const qtyInputContainer = qtyInput.closest('.qty-input')
            const minusButton = qtyInputContainer.querySelector('.qty-count--minus')
            const addButton = qtyInputContainer.querySelector('.qty-count--add')

            minusButton.classList.toggle('disabled', currentQty <= min)
            addButton.classList.toggle('disabled', currentQty >= max)
        }
    }

    function calculateCartTotal() {
        const cartItems = storage.getCart()
        let subtotal = 0
        let hasShipping = false
        let shippingGroups = {}
        totalShippingCost = 0

        cartItems.forEach((cartItem) => {
            const productData = productsData.find((product) => String(product.id) === String(cartItem.id))
            if (productData) {
                const itemTotal = parseFloat(productData.price) * cartItem.qty
                subtotal += itemTotal

                if (productData.shipping_type !== 'sans_envoi') {
                    if (!shippingGroups[productData.shipping_type]) {
                        shippingGroups[productData.shipping_type] = {
                            totalPoints: 0,
                            totalWeight: 0,
                            colisData: shipping_rate.types_colis[productData.shipping_type]
                        }
                    }
                    shippingGroups[productData.shipping_type].totalPoints += productData.shipping_point * cartItem.qty
                    shippingGroups[productData.shipping_type].totalWeight += parseFloat(productData.weight || 0) * cartItem.qty
                }
            }
        })

        Object.keys(shippingGroups).forEach((shippingType) => {
            const group = shippingGroups[shippingType]
            const colisCapacity = group.colisData.capacite_points
            const numberOfColis = Math.ceil(group.totalPoints / colisCapacity)
            const totalWeight = group.totalWeight + (group.colisData.poids_emballage * numberOfColis)
            const selectedZone = shippingSelect.value
            const cost = calculateCostForColis(totalWeight, selectedZone)
            totalShippingCost += cost
            hasShipping = true
        })

        if (!hasShipping && shippingSelect) {
            shippingSelect.classList.add('disabled')
        } else if (shippingSelect) {
            shippingSelect.classList.remove('disabled')
        }

        const total = subtotal + totalShippingCost
        updateTicket(subtotal, totalShippingCost, total)
    }

    function calculateCostForColis(totalWeight, selectedZone) {
        const tarifs = shipping_rate.grille_tarifs[selectedZone].tarifs
        const tarif = tarifs.find(t => totalWeight <= t.poids_max)
        return tarif ? tarif.tarif : 0
    }

    function updateTicket(subtotal, shippingCost, total) {
        subtotalElement.textContent = `${formatPrice(subtotal)} €`
        shippingElement.textContent = `${formatPrice(shippingCost)} €`
        totalElement.textContent = `${formatPrice(total)} €`
    }

    function getActiveLanguage() {
        const selectedLangElement = document.querySelector('.language-list .btn-nav.selected')
        return selectedLangElement ? selectedLangElement.textContent.trim().toLowerCase() : 'fr'
    }

    function updateCartVisibility() {
        const cartItems = storage.getCart()
        if (sectionCart && sectionNoCart) {
            if (cartItems.length === 0) {
                sectionCart.classList.add('display-none')
                sectionNoCart.classList.remove('display-none')
            } else {
                sectionCart.classList.remove('display-none')
                sectionNoCart.classList.add('display-none')
            }
        }
    }

    function setSelectedCountry() {
        const countryIso = storage.getCountry()
        const options = shippingSelect.options
        for (let i = 0; i < options.length; i++) {
            const option = options[i];
            if (option.getAttribute('data-iso') === countryIso) {
                option.selected = true
                break;
            }
        }
    }


    function checkoutButtonEventListener() {
        checkoutButton.addEventListener('click', async (event) => {
            event.preventDefault()
            fullscreenLoader.classList.add('loader-visible')

            const cartData = storage.getCart() || []

            try {
                const response = await fetch('/.netlify/functions/create-checkout-session', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        cartItems: cartData,
                        currentLang: CURRENT_LANG,
                        shippingAmount: totalShippingCost,
                        country: storage.getCountry()
                    }),
                })

                const { sessionId } = await response.json()

                const stripe = Stripe(settings.STRIPE_PUBLIC_KEY)
                await stripe.redirectToCheckout({ sessionId })

            } catch (err) {
                console.error('Erreur lors de la création de la session de paiement :', err)
            }
        })
    }
})
