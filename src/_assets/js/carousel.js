document.addEventListener('DOMContentLoaded', function () {
    const splide = new Splide('#card-carousel', {
        pagination: false,
        keyboard: true
    })

    const thumbnails = document.getElementsByClassName('card-thumbnail')
    let current

    for (let i = 0; i < thumbnails.length; i++) {
        initThumbnail(thumbnails[i], i)
    }

    function initThumbnail(thumbnail, index) {
        thumbnail.addEventListener('click', function () {
            splide.go(index)
        })
    }

    splide.on('mounted move', function () {
        const thumbnail = thumbnails[splide.index]

        if (thumbnail) {
            if (current) {
                current.classList.remove('is-active')
            }

            thumbnail.classList.add('is-active')
            current = thumbnail
        }
    })

    splide.mount()
})
