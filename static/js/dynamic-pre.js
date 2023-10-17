function theme_initialize() {
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark')
        document.body.classList.remove('light')
    } else {
        document.body.classList.add('light')
        document.body.classList.remove('dark')
    }
}
theme_initialize()