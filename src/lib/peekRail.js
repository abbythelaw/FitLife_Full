const MOBILE_QUERY = '(hover: none), (pointer: coarse)'

function sidebar() {
  return document.querySelector('.app > aside')
}

function deriveLabel(element) {
  const explicit = element.getAttribute('aria-label') || element.dataset.label || element.title
  if (explicit) return explicit.trim()
  return String(element.textContent || '').replace(/\s+/g, ' ').trim()
}

function wrapLabels(root) {
  const items = root.querySelectorAll('nav > button, nav > a, .nav > button, .nav > a, .sidebar-nav > button, .sidebar-nav > a')
  items.forEach(item => {
    const label = deriveLabel(item)
    if (label) {
      item.setAttribute('aria-label', label)
      item.dataset.label = label
      item.title = label
    }

    const directText = [...item.childNodes].filter(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim())
    directText.forEach(node => {
      const span = document.createElement('span')
      span.className = 'fl-nav-label'
      span.textContent = node.textContent.trim()
      node.replaceWith(span)
    })

    const candidates = item.querySelectorAll(':scope > span:not(.fl-nav-label)')
    candidates.forEach(span => {
      if (!span.classList.length && span.textContent.trim()) span.classList.add('fl-nav-label')
    })
  })
}

function ensureBackdrop() {
  let backdrop = document.querySelector('.fl-peek-backdrop')
  if (!backdrop) {
    backdrop = document.createElement('button')
    backdrop.type = 'button'
    backdrop.className = 'fl-peek-backdrop'
    backdrop.setAttribute('aria-label', 'Close navigation')
    document.body.appendChild(backdrop)
  }
  return backdrop
}

function closeRail() {
  const rail = sidebar()
  if (!rail) return
  rail.dataset.peekOpen = 'false'
  rail.classList.remove('open')
  document.body.classList.remove('fl-peek-open')
}

function openRail() {
  const rail = sidebar()
  if (!rail) return
  rail.dataset.peekOpen = 'true'
  rail.classList.add('open')
  document.body.classList.add('fl-peek-open')
}



function profileInitials(value) {
  const words = String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (!words.length) return 'AS'
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase()
  }

  return `${words[0][0] || ''}${words.at(-1)[0] || ''}`
    .toUpperCase()
}

function findProfileSource(rail) {
  const candidates = [
    ...rail.querySelectorAll(
      '[class*="profile"], [class*="account"], ' +
      '[class*="user"], [class*="sync"]'
    )
  ]

  return candidates.find(element => {
    const text = String(element.textContent || '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase()

    return (
      text.includes('abner') ||
      text.includes('synced') ||
      text === 'as'
    )
  }) || null
}

function profilePhotoFrom(source) {
  if (!source) return ''

  const image = source.matches?.('img')
    ? source
    : source.querySelector?.('img')

  return (
    image?.currentSrc ||
    image?.src ||
    source.dataset?.avatarUrl ||
    source.dataset?.photoUrl ||
    ''
  )
}

function ensureRailProfile(rail) {
  if (!rail || rail.querySelector('.fl-rail-profile')) return

  const source = findProfileSource(rail)
  const sourceText = String(source?.textContent || '')
    .replace(/\s+/g, ' ')
    .trim()

  const name =
    source?.dataset?.name ||
    source?.getAttribute?.('aria-label') ||
    (sourceText && sourceText.toLowerCase() !== 'synced'
      ? sourceText.replace(/synced/ig, '').trim()
      : '') ||
    'Abner Serania'

  const photo = profilePhotoFrom(source)
  const container = document.createElement('button')
  container.type = 'button'
  container.className = 'fl-rail-profile'
  container.setAttribute('aria-label', `Profile: ${name}`)
  container.title = name

  const avatar = document.createElement('span')
  avatar.className = 'fl-rail-avatar'

  if (photo) {
    const image = document.createElement('img')
    image.src = photo
    image.alt = ''
    image.className = 'fl-rail-avatar-image'
    image.addEventListener('error', () => {
      avatar.replaceChildren()
      avatar.classList.add('initials')
      avatar.textContent = profileInitials(name)
    })
    avatar.appendChild(image)
  } else {
    avatar.classList.add('initials')
    avatar.textContent = profileInitials(name)
  }

  const details = document.createElement('span')
  details.className = 'fl-rail-profile-details'

  const nameNode = document.createElement('b')
  nameNode.textContent = name

  const status = document.createElement('small')
  status.innerHTML = '<i></i> Synced'

  details.append(nameNode, status)
  container.append(avatar, details)

  const brand = rail.querySelector('.brand')
  const nav = rail.querySelector('nav, .nav, .sidebar-nav')

  if (nav) {
    nav.before(container)
  } else if (brand?.nextSibling) {
    brand.after(container)
  } else {
    rail.appendChild(container)
  }

  container.addEventListener('click', event => {
    event.stopPropagation()

    if (matchMedia(MOBILE_QUERY).matches) {
      rail.dataset.peekOpen === 'true'
        ? closeRail()
        : openRail()
    } else {
      location.hash = 'settings'
    }
  })

  if (source && !source.closest('.fl-rail-profile')) {
    source.classList.add('fl-original-profile-source')
    source.setAttribute('aria-hidden', 'true')
  }
}

function setup() {
  const rail = sidebar()
  if (!rail || rail.dataset.peekReady === 'true') return
  rail.dataset.peekReady = 'true'
  rail.dataset.peekOpen = 'false'
  wrapLabels(rail)
  ensureRailProfile(rail)

  const backdrop = ensureBackdrop()
  backdrop.addEventListener('click', closeRail)

  const brand = rail.querySelector('.brand')
  if (brand) {
    brand.setAttribute('role', 'button')
    brand.setAttribute('tabindex', '0')
    brand.setAttribute('aria-label', 'Toggle FitLife navigation')
    const toggle = event => {
      if (!matchMedia(MOBILE_QUERY).matches) return
      event.preventDefault()
      rail.dataset.peekOpen === 'true' ? closeRail() : openRail()
    }
    brand.addEventListener('click', toggle)
    brand.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') toggle(event)
      if (event.key === 'Escape') closeRail()
    })
  }

  rail.querySelectorAll('nav button, nav a, .nav button, .nav a, .sidebar-nav button, .sidebar-nav a').forEach(item => {
    item.addEventListener('click', () => {
      if (matchMedia(MOBILE_QUERY).matches) setTimeout(closeRail, 60)
    })
  })

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeRail()
  })
}

let frame
const observer = new MutationObserver(() => {
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(setup)
})
observer.observe(document.documentElement, {childList: true, subtree: true})

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup)
else setup()

window.fitlifePeekRail = {open: openRail, close: closeRail, setup}
