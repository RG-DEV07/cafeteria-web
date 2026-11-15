/* ==========================================================================
   CafeteríaRG · interacciones
   --------------------------------------------------------------------------
    1 Movimiento: estado y botón de pausa
    2 Barra y menú móvil
    3 Elementos que entran al aparecer en pantalla
    4 Pase de fotos del inicio
    5 Frase del titular que cambia
    6 Cintas que corren solas (palabras y tiras de fotos)
    7 Visor de fotos
    8 Efectos con el cursor
    9 Pestañas de la carta
   10 Bucle: scroll, cintas y sello
   11 Horario de hoy y año del pie
   ========================================================================== */
(() => {
  'use strict';

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const raiz = document.documentElement;
  const limitar = (valor, minimo, maximo) => Math.min(maximo, Math.max(minimo, valor));
  const conTeclado = (elemento) => {
    try {
      return elemento.matches(':focus-visible');
    } catch (error) {
      return false;
    }
  };

  /* 1 · Movimiento: estado y botón de pausa -------------------------------
     La clase .mov en <html> enciende todo lo que se mueve. Está activa salvo
     que el visitante la pause con el botón (queda guardado en su navegador). */
  const CLAVE = 'rg-movimiento';
  const sistemaPideMenos = window.matchMedia('(prefers-reduced-motion: reduce)');
  const punteroFino = window.matchMedia('(hover: hover) and (pointer: fine)');

  const leerPreferencia = () => {
    try {
      return window.localStorage.getItem(CLAVE);
    } catch (error) {
      return null;
    }
  };
  const guardarPreferencia = (valor) => {
    try {
      window.localStorage.setItem(CLAVE, valor);
    } catch (error) {
      /* sin almacenamiento: la elección vale solo para esta visita */
    }
  };
  const movimientoPorDefecto = () => !(raiz.dataset.movimiento === 'respetar' && sistemaPideMenos.matches);
  const hayMovimiento = () => raiz.classList.contains('mov');

  // Por si el aviso de seguridad de index.html ya retiró las clases (carga lenta)
  raiz.classList.add('js');
  {
    const guardada = leerPreferencia();
    raiz.classList.toggle('mov', guardada ? guardada === 'si' : movimientoPorDefecto());
  }

  const alCambiarMovimiento = [];
  const mando = $('[data-mov]');
  const mandoTexto = $('[data-mov-texto]');
  const mandoIcono = mando ? $('use', mando) : null;

  const pintarMando = () => {
    if (!mando) return;
    const texto = hayMovimiento() ? 'Pausar movimiento' : 'Activar movimiento';
    if (mandoTexto) mandoTexto.textContent = texto;
    if (mandoIcono) mandoIcono.setAttribute('href', hayMovimiento() ? '#i-pausa' : '#i-play');
    mando.title = texto;
  };

  const ponerMovimiento = (activo, recordar) => {
    raiz.classList.toggle('mov', activo);
    if (recordar) guardarPreferencia(activo ? 'si' : 'no');
    pintarMando();
    alCambiarMovimiento.forEach((aviso) => aviso(activo));
  };

  if (mando) mando.addEventListener('click', () => ponerMovimiento(!hayMovimiento(), true));
  sistemaPideMenos.addEventListener('change', () => {
    if (!leerPreferencia()) ponerMovimiento(movimientoPorDefecto(), false);
  });
  pintarMando();

  /* 2 · Barra y menú móvil ------------------------------------------------ */
  const barra = $('[data-barra]');
  const nav = $('#menu-principal');
  const hamb = $('[data-hamb]');
  const hambTexto = $('[data-hamb-texto]');
  const enlaces = $$('.nav a[href^="#"]');
  const secciones = enlaces.map((a) => $(a.getAttribute('href'))).filter(Boolean);

  const menuAbierto = () => hamb && hamb.getAttribute('aria-expanded') === 'true';

  const ponerMenu = (abierto) => {
    if (!hamb || !nav) return;
    hamb.setAttribute('aria-expanded', String(abierto));
    nav.classList.toggle('is-open', abierto);
    raiz.classList.toggle('menu-abierto', abierto);
    if (hambTexto) hambTexto.textContent = abierto ? 'Cerrar menú' : 'Abrir menú';
  };

  if (hamb && nav) {
    hamb.addEventListener('click', () => ponerMenu(!menuAbierto()));
    nav.addEventListener('click', (e) => {
      if (e.target.closest('a')) ponerMenu(false);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menuAbierto()) {
        ponerMenu(false);
        hamb.focus();
      }
    });
    window.matchMedia('(min-width: 901px)').addEventListener('change', () => ponerMenu(false));
  }

  /* 3 · Elementos que entran al aparecer en pantalla ----------------------
     [data-reveal]  fotos que se abren como una persiana
     [data-vista]   bloques cuyas líneas se dibujan
     [data-cascada] grupos cuyos hijos entran uno tras otro */
  const hero = $('.hero');

  for (const grupo of $$('[data-cascada]')) {
    Array.from(grupo.children).forEach((hijo, orden) => hijo.style.setProperty('--n', String(orden)));
  }

  const vistas = $$('[data-vista], [data-reveal], [data-cascada]');

  if ('IntersectionObserver' in window) {
    const ojo = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (!entrada.isIntersecting) continue;
          const elemento = entrada.target;
          elemento.classList.add('is-in');
          ojo.unobserve(elemento);
          // Ya entró: que no vuelva a entrar al pausar y reactivar el movimiento
          window.setTimeout(() => elemento.classList.add('is-hecha'), 1800);
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.15 }
    );
    vistas.forEach((el) => ojo.observe(el));

    // Lo que se repite en el inicio descansa cuando el inicio no está en pantalla
    if (hero) {
      new IntersectionObserver(([entrada]) => hero.classList.toggle('is-fuera', !entrada.isIntersecting)).observe(hero);
    }
  } else {
    vistas.forEach((el) => el.classList.add('is-in', 'is-hecha'));
  }

  // La entrada del inicio ocurre una sola vez. Cuando termina (el sello es lo
  // último en llegar) se marca, y de paso se retira el telón.
  const terminarEntrada = () => {
    raiz.classList.add('ya-entro');
    raiz.classList.remove('telon');
  };
  const selloInicio = $('.sello');
  if (selloInicio && hayMovimiento()) {
    selloInicio.addEventListener('animationend', (e) => {
      if (e.animationName === 'estampa') terminarEntrada();
    });
    window.setTimeout(terminarEntrada, 6000);
  } else {
    terminarEntrada();
  }

  /* 4 · Pase de fotos del inicio -------------------------------------------
     La marca activa se llena con una animación de CSS; cuando termina, pasa
     la foto. Así el tiempo, la pausa y el botón de movimiento salen solos. */
  const pase = $('[data-pase]');

  if (pase) {
    const fotos = $$('[data-pase-foto]', pase);
    const marcas = $$('[data-pase-marca]', pase);
    const aviso = $('[data-pase-aviso]', pase);
    let actual = 0;
    let conCursor = false;
    let conFoco = false;

    const cargar = (figura) => {
      const img = figura ? $('img[data-src]', figura) : null;
      if (!img) return;
      img.src = img.dataset.src;
      img.removeAttribute('data-src');
    };

    let salida = 0;
    const ir = (indice, porVisitante) => {
      const destino = (indice + fotos.length) % fotos.length;
      if (destino === actual) return;
      cargar(fotos[destino]);
      cargar(fotos[(destino + 1) % fotos.length]);
      // La que sale queda entera debajo hasta que la nueva termina de aparecer
      const anterior = fotos[actual];
      fotos.forEach((foto) => foto.classList.remove('is-sale'));
      anterior.classList.remove('is-on');
      anterior.classList.add('is-sale');
      anterior.setAttribute('aria-hidden', 'true');
      window.clearTimeout(salida);
      salida = window.setTimeout(() => anterior.classList.remove('is-sale'), 1200);
      fotos[destino].classList.add('is-on');
      fotos[destino].removeAttribute('aria-hidden');
      marcas.forEach((marca, n) => {
        marca.classList.toggle('is-on', n === destino);
        marca.classList.toggle('is-hecha', n < destino);
        if (n === destino) marca.setAttribute('aria-current', 'true');
        else marca.removeAttribute('aria-current');
      });
      actual = destino;
      if (porVisitante && aviso) aviso.textContent = `Foto ${destino + 1} de ${fotos.length}`;
    };

    const pintarPausa = () => pase.classList.toggle('is-pausa', conCursor || conFoco);

    pase.addEventListener('animationend', (e) => {
      if (e.animationName === 'llenar') ir(actual + 1, false);
    });

    const anterior = $('[data-pase-ant]', pase);
    const siguiente = $('[data-pase-sig]', pase);
    if (anterior) anterior.addEventListener('click', () => ir(actual - 1, true));
    if (siguiente) siguiente.addEventListener('click', () => ir(actual + 1, true));
    marcas.forEach((marca, n) => marca.addEventListener('click', () => ir(n, true)));

    pase.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') ir(actual - 1, true);
      if (e.key === 'ArrowRight') ir(actual + 1, true);
    });

    // Se detiene mientras el cursor está encima o un mando tiene el foco
    pase.addEventListener('pointerenter', (e) => {
      conCursor = e.pointerType === 'mouse';
      pintarPausa();
    });
    pase.addEventListener('pointerleave', () => {
      conCursor = false;
      pintarPausa();
    });
    pase.addEventListener('focusin', () => {
      conFoco = true;
      pintarPausa();
    });
    pase.addEventListener('focusout', () => {
      conFoco = false;
      pintarPausa();
    });

    // Deslizar con el dedo
    let dedoX = null;
    pase.addEventListener('pointerdown', (e) => {
      dedoX = e.pointerType === 'mouse' ? null : e.clientX;
    });
    pase.addEventListener('pointerup', (e) => {
      if (dedoX === null) return;
      const dx = e.clientX - dedoX;
      dedoX = null;
      if (Math.abs(dx) > 44) ir(actual + (dx < 0 ? 1 : -1), true);
    });
    pase.addEventListener('pointercancel', () => {
      dedoX = null;
    });

    // La segunda foto se pide cuando la página ya cargó
    window.addEventListener('load', () => cargar(fotos[1]));
  }

  /* 5 · Frase del titular que cambia -------------------------------------- */
  const gira = $('[data-gira]');

  if (gira) {
    const frases = $$('.gira__f', gira);
    let turno = 0;

    const volverALaPrimera = () => {
      frases.forEach((frase, n) => {
        frase.classList.remove('is-sale');
        frase.classList.toggle('is-on', n === 0);
        frase.classList.toggle('is-inicial', n === 0);
      });
      turno = 0;
    };

    window.setInterval(() => {
      if (!hayMovimiento() || document.hidden || frases.length < 2) return;
      if (hero && hero.classList.contains('is-fuera')) return;
      const sale = frases[turno];
      turno = (turno + 1) % frases.length;
      const entra = frases[turno];
      sale.classList.remove('is-on', 'is-inicial');
      sale.classList.add('is-sale');
      entra.classList.remove('is-sale');
      entra.classList.add('is-on');
      window.setTimeout(() => sale.classList.remove('is-sale'), 750);
    }, 3200);

    alCambiarMovimiento.push((activo) => {
      if (!activo) volverALaPrimera();
    });
  }

  /* 6 · Cintas que corren solas -------------------------------------------
     Cada [data-cinta] avanza sola a data-vel píxeles por segundo, se acelera
     con el scroll y se detiene bajo el cursor. Con data-arrastre además se
     puede arrastrar. Para que no tenga fin, su contenido está dos veces. */
  $$('[data-luz]').forEach((enlace, n) => {
    enlace.dataset.indice = String(n);
  });

  const cintas = $$('[data-cinta]').map((fila) => {
    if (fila.hasAttribute('data-duplicar')) {
      for (const hijo of Array.from(fila.children)) {
        const copia = hijo.cloneNode(true);
        copia.setAttribute('aria-hidden', 'true');
        copia.setAttribute('tabindex', '-1');
        copia.dataset.clon = '';
        fila.appendChild(copia);
      }
    }
    for (const pieza of $$('a, img', fila)) pieza.setAttribute('draggable', 'false');

    return {
      fila,
      sentido: Number(fila.dataset.dir) < 0 ? -1 : 1,
      base: Number(fila.dataset.vel) || 30,
      x: 0,
      periodo: 0,
      ritmo: 1,
      visible: true,
      conCursor: false,
      agarrada: false,
      impulso: 0,
      arrastro: false,
      conFoco: false,
    };
  });

  const medirCintas = () => {
    for (const cinta of cintas) {
      const hueco = parseFloat(window.getComputedStyle(cinta.fila).columnGap) || 0;
      cinta.periodo = (cinta.fila.scrollWidth + hueco) / 2;
      if (cinta.periodo <= 0) continue;
      cinta.x = ((cinta.x % cinta.periodo) + cinta.periodo) % cinta.periodo;
      pintarCinta(cinta);
    }
  };

  // dx positivo = el contenido se corre hacia la derecha
  const correr = (cinta, dx) => {
    if (cinta.periodo <= 0) return;
    cinta.x += cinta.sentido < 0 ? -dx : dx;
    cinta.x = ((cinta.x % cinta.periodo) + cinta.periodo) % cinta.periodo;
  };

  const pintarCinta = (cinta) => {
    const x = cinta.sentido < 0 ? -cinta.x : cinta.x - cinta.periodo;
    cinta.fila.style.setProperty('--x', `${x.toFixed(1)}px`);
  };

  for (const cinta of cintas) {
    const { fila } = cinta;

    fila.addEventListener('pointerenter', (e) => {
      cinta.conCursor = e.pointerType === 'mouse';
    });
    fila.addEventListener('pointerleave', () => {
      cinta.conCursor = false;
    });

    // Con el teclado: la cinta se detiene y acerca la foto enfocada a la vista
    fila.addEventListener('focusin', (e) => {
      const pieza = e.target instanceof Element ? e.target.closest('a') : null;
      if (!pieza || !conTeclado(pieza) || cinta.periodo <= 0) return;
      cinta.conFoco = true;
      cinta.ritmo = 0;
      cinta.impulso = 0;
      const izquierda = pieza.getBoundingClientRect().left - fila.getBoundingClientRect().left;
      const destino = limitar(24 - izquierda, -cinta.periodo, 0);
      cinta.x = cinta.sentido < 0 ? -destino : destino + cinta.periodo;
      pintarCinta(cinta);
    });
    fila.addEventListener('focusout', () => {
      cinta.conFoco = false;
    });

    if (!fila.hasAttribute('data-arrastre')) continue;

    let puntero = null;
    let ultimoX = 0;
    let ultimoT = 0;
    let recorrido = 0;

    fila.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      puntero = e.pointerId;
      ultimoX = e.clientX;
      ultimoT = e.timeStamp;
      recorrido = 0;
      cinta.impulso = 0;
      cinta.arrastro = false;
    });

    fila.addEventListener('pointermove', (e) => {
      if (e.pointerId !== puntero) return;
      const dx = e.clientX - ultimoX;
      const dt = Math.max(1, e.timeStamp - ultimoT);
      recorrido += Math.abs(dx);
      if (!cinta.agarrada && recorrido > 6) {
        cinta.agarrada = true;
        cinta.arrastro = true;
        fila.classList.add('is-agarrada');
        try {
          fila.setPointerCapture(puntero);
        } catch (error) {
          /* el puntero ya no existe */
        }
      }
      if (cinta.agarrada) {
        correr(cinta, dx);
        pintarCinta(cinta);
        cinta.impulso = limitar((dx / dt) * 1000, -2600, 2600);
      }
      ultimoX = e.clientX;
      ultimoT = e.timeStamp;
    });

    const soltar = (e) => {
      if (e.pointerId !== puntero) return;
      puntero = null;
      cinta.agarrada = false;
      fila.classList.remove('is-agarrada');
    };
    fila.addEventListener('pointerup', soltar);
    fila.addEventListener('pointercancel', soltar);

    // Después de arrastrar, el clic no debe abrir la foto
    fila.addEventListener(
      'click',
      (e) => {
        if (!cinta.arrastro) return;
        e.preventDefault();
        e.stopPropagation();
        cinta.arrastro = false;
      },
      true
    );
  }

  if ('IntersectionObserver' in window) {
    const ojoCintas = new IntersectionObserver((entradas) => {
      for (const entrada of entradas) {
        const cinta = cintas.find((c) => c.fila === entrada.target);
        if (cinta) cinta.visible = entrada.isIntersecting;
      }
    });
    cintas.forEach((cinta) => ojoCintas.observe(cinta.fila));
  }

  medirCintas();
  window.addEventListener('resize', medirCintas);
  window.addEventListener('load', medirCintas);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(medirCintas);

  // Al pausar, las cintas se quedan quietas donde estaban
  alCambiarMovimiento.push((activo) => {
    if (activo) return;
    for (const cinta of cintas) cinta.impulso = 0;
  });

  /* 7 · Visor de fotos -----------------------------------------------------
     Un clic en una foto de «El lugar» la abre en grande, con flechas,
     teclado y deslizamiento. Sin JavaScript, el enlace abre la imagen. */
  const fotosLuz = $$('[data-luz]').filter((enlace) => !('clon' in enlace.dataset));
  const admiteDialogo = typeof HTMLDialogElement === 'function' && 'showModal' in HTMLDialogElement.prototype;
  let luz = null;
  let luzImg = null;
  let luzPie = null;
  let luzCuenta = null;
  let luzIndice = 0;

  const mostrarEnLuz = (indice) => {
    luzIndice = (indice + fotosLuz.length) % fotosLuz.length;
    const enlace = fotosLuz[luzIndice];
    const miniatura = $('img', enlace);
    const texto = miniatura ? miniatura.alt : '';
    luzImg.classList.remove('is-entra');
    luzImg.src = enlace.href;
    luzImg.alt = texto;
    luzPie.textContent = texto;
    luzCuenta.textContent = `${luzIndice + 1} / ${fotosLuz.length}`;
    void luzImg.offsetWidth; // reinicia la animación de entrada
    luzImg.classList.add('is-entra');
  };

  const crearLuz = () => {
    luz = document.createElement('dialog');
    luz.className = 'luz';
    luz.setAttribute('aria-label', 'Fotos del lugar');
    luz.innerHTML = `
      <div class="luz__barra">
        <p class="luz__cuenta" data-luz-cuenta></p>
        <button class="luz__btn" type="button" data-luz-cerrar aria-label="Cerrar">
          <svg class="ico" aria-hidden="true"><use href="#i-cerrar"/></svg>
        </button>
      </div>
      <div class="luz__escena" data-luz-escena>
        <button class="luz__btn luz__flecha luz__flecha--ant" type="button" data-luz-ant aria-label="Foto anterior">
          <svg class="ico" aria-hidden="true"><use href="#i-flecha-izq"/></svg>
        </button>
        <img class="luz__img" alt="" data-luz-img>
        <button class="luz__btn luz__flecha luz__flecha--sig" type="button" data-luz-sig aria-label="Foto siguiente">
          <svg class="ico" aria-hidden="true"><use href="#i-flecha"/></svg>
        </button>
      </div>
      <p class="luz__pie" data-luz-pie></p>`;
    document.body.appendChild(luz);

    luzImg = $('[data-luz-img]', luz);
    luzPie = $('[data-luz-pie]', luz);
    luzCuenta = $('[data-luz-cuenta]', luz);
    const escena = $('[data-luz-escena]', luz);

    $('[data-luz-cerrar]', luz).addEventListener('click', () => luz.close());
    $('[data-luz-ant]', luz).addEventListener('click', () => mostrarEnLuz(luzIndice - 1));
    $('[data-luz-sig]', luz).addEventListener('click', () => mostrarEnLuz(luzIndice + 1));

    // Un clic fuera de la foto cierra el visor
    luz.addEventListener('click', (e) => {
      if (e.target === luz || e.target === escena) luz.close();
    });
    luz.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') mostrarEnLuz(luzIndice - 1);
      if (e.key === 'ArrowRight') mostrarEnLuz(luzIndice + 1);
    });
    luz.addEventListener('close', () => raiz.classList.remove('luz-abierta'));

    let dedoX = null;
    escena.addEventListener('pointerdown', (e) => {
      dedoX = e.pointerType === 'mouse' ? null : e.clientX;
    });
    escena.addEventListener('pointerup', (e) => {
      if (dedoX === null) return;
      const dx = e.clientX - dedoX;
      dedoX = null;
      if (Math.abs(dx) > 44) mostrarEnLuz(luzIndice + (dx < 0 ? 1 : -1));
    });
    escena.addEventListener('pointercancel', () => {
      dedoX = null;
    });
  };

  if (admiteDialogo && fotosLuz.length) {
    document.addEventListener('click', (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const enlace = e.target instanceof Element ? e.target.closest('[data-luz]') : null;
      if (!enlace) return;
      e.preventDefault();
      if (!luz) crearLuz();
      mostrarEnLuz(Number(enlace.dataset.indice) || 0);
      raiz.classList.add('luz-abierta');
      luz.showModal();
    });
  }

  /* 8 · Efectos con el cursor ---------------------------------------------
     Solo con ratón o panel táctil, y solo con el movimiento activo. */
  let burbuja = null;

  if (punteroFino.matches) {
    // Fotos que se inclinan hacia el cursor
    for (const caja of $$('[data-inclina]')) {
      caja.addEventListener('pointermove', (e) => {
        if (!hayMovimiento()) return;
        const marco = caja.getBoundingClientRect();
        const px = (e.clientX - marco.left) / marco.width - 0.5;
        const py = (e.clientY - marco.top) / marco.height - 0.5;
        caja.style.setProperty('--ry', `${(px * 7).toFixed(2)}deg`);
        caja.style.setProperty('--rx', `${(-py * 7).toFixed(2)}deg`);
      });
      caja.addEventListener('pointerleave', () => {
        caja.style.removeProperty('--rx');
        caja.style.removeProperty('--ry');
      });
    }

    // Botones que siguen un poco al cursor
    for (const boton of $$('[data-iman]')) {
      boton.addEventListener('pointermove', (e) => {
        if (!hayMovimiento()) return;
        const marco = boton.getBoundingClientRect();
        const dx = e.clientX - (marco.left + marco.width / 2);
        const dy = e.clientY - (marco.top + marco.height / 2);
        boton.style.setProperty('--mx', `${limitar(dx * 0.22, -9, 9).toFixed(1)}px`);
        boton.style.setProperty('--my', `${limitar(dy * 0.3, -6, 6).toFixed(1)}px`);
      });
      boton.addEventListener('pointerleave', () => {
        boton.style.removeProperty('--mx');
        boton.style.removeProperty('--my');
      });
    }

    // En el inicio, la tarjeta y el sello se corren apenas con el cursor
    const escenaInicio = $('[data-escena]');
    if (escenaInicio) {
      escenaInicio.addEventListener('pointermove', (e) => {
        if (!hayMovimiento()) return;
        const marco = escenaInicio.getBoundingClientRect();
        const hx = ((e.clientX - marco.left) / marco.width - 0.5) * 2;
        const hy = ((e.clientY - marco.top) / marco.height - 0.5) * 2;
        escenaInicio.style.setProperty('--hx', limitar(hx, -1, 1).toFixed(3));
        escenaInicio.style.setProperty('--hy', limitar(hy, -1, 1).toFixed(3));
      });
      escenaInicio.addEventListener('pointerleave', () => {
        escenaInicio.style.removeProperty('--hx');
        escenaInicio.style.removeProperty('--hy');
      });
    }

    // Círculo «Ver» que acompaña al cursor sobre las fotos del lugar
    if (admiteDialogo && fotosLuz.length) {
      burbuja = document.createElement('div');
      burbuja.className = 'burbuja';
      burbuja.setAttribute('aria-hidden', 'true');
      burbuja.textContent = 'Ver';
      document.body.appendChild(burbuja);

      document.addEventListener(
        'pointermove',
        (e) => {
          const sobreFoto =
            hayMovimiento() &&
            e.target instanceof Element &&
            Boolean(e.target.closest('[data-luz]')) &&
            !cintas.some((cinta) => cinta.agarrada);
          burbuja.classList.toggle('is-on', sobreFoto);
          if (!sobreFoto) return;
          burbuja.style.setProperty('--bx', `${e.clientX}px`);
          burbuja.style.setProperty('--by', `${e.clientY}px`);
        },
        { passive: true }
      );
      document.addEventListener('pointerleave', () => burbuja.classList.remove('is-on'));
      window.addEventListener('blur', () => burbuja.classList.remove('is-on'));
    }
  }

  alCambiarMovimiento.push((activo) => {
    if (activo) return;
    if (burbuja) burbuja.classList.remove('is-on');
    for (const el of $$('[data-inclina], [data-iman], [data-escena]')) {
      for (const propiedad of ['--rx', '--ry', '--mx', '--my', '--hx', '--hy']) el.style.removeProperty(propiedad);
    }
  });

  /* 9 · Pestañas de la carta ---------------------------------------------- */
  const lista = $('[role="tablist"]');

  if (lista) {
    const pestanas = $$('[role="tab"]', lista);
    const indicador = $('.tabs__ind', lista);
    const fotos = $$('[data-foto]');
    const panelDe = (pestana) => document.getElementById(pestana.getAttribute('aria-controls'));

    // La foto nueva se abre sobre la anterior, que queda debajo hasta que termina
    let relevo = 0;
    const mostrarFoto = (categoria) => {
      const nueva = fotos.find((foto) => foto.dataset.foto === categoria);
      const anterior = fotos.find((foto) => foto.classList.contains('is-on'));
      if (!nueva || nueva === anterior) return;
      fotos.forEach((foto) => foto.classList.remove('is-antes'));
      if (anterior) {
        anterior.classList.remove('is-on');
        anterior.classList.add('is-antes');
      }
      nueva.classList.add('is-on');
      window.clearTimeout(relevo);
      relevo = window.setTimeout(() => fotos.forEach((foto) => foto.classList.remove('is-antes')), 1000);
    };

    const moverIndicador = (pestana) => {
      if (!indicador || !pestana) return;
      indicador.style.setProperty('--x', `${pestana.offsetLeft}px`);
      indicador.style.setProperty('--w', `${pestana.offsetWidth}px`);
    };

    let finDeEntrada = 0;
    const entrarPlatos = (panel) => {
      panel.classList.remove('is-entrando');
      void panel.offsetWidth; // reinicia la animación de entrada
      panel.classList.add('is-entrando');
      window.clearTimeout(finDeEntrada);
      finDeEntrada = window.setTimeout(() => panel.classList.remove('is-entrando'), 1100);
    };

    const activar = (pestana, { foco = false, animar = true } = {}) => {
      for (const otra of pestanas) {
        const elegida = otra === pestana;
        const panel = panelDe(otra);
        otra.setAttribute('aria-selected', String(elegida));
        otra.tabIndex = elegida ? 0 : -1;
        if (!panel) continue;
        panel.hidden = !elegida;
        panel.classList.remove('is-entrando');
        if (elegida && animar) entrarPlatos(panel);
      }
      mostrarFoto(pestana.dataset.cat);
      moverIndicador(pestana);
      if (foco) {
        pestana.focus();
        pestana.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
    };

    lista.addEventListener('click', (e) => {
      const pestana = e.target.closest('[role="tab"]');
      if (pestana) activar(pestana);
    });

    lista.addEventListener('keydown', (e) => {
      const i = pestanas.indexOf(document.activeElement);
      if (i < 0) return;
      const destino = {
        ArrowRight: (i + 1) % pestanas.length,
        ArrowLeft: (i - 1 + pestanas.length) % pestanas.length,
        Home: 0,
        End: pestanas.length - 1,
      }[e.key];
      if (destino === undefined) return;
      e.preventDefault();
      activar(pestanas[destino], { foco: true });
    });

    const elegida = () => pestanas.find((p) => p.getAttribute('aria-selected') === 'true') || pestanas[0];
    activar(elegida(), { animar: false });
    window.addEventListener('resize', () => moverIndicador(elegida()));
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => moverIndicador(elegida()));

    // La primera vez que la carta entra en pantalla, los platos llegan en fila
    const cajaCarta = lista.parentElement;
    if ('IntersectionObserver' in window) {
      const ojoCarta = new IntersectionObserver(
        ([entrada]) => {
          if (!entrada.isIntersecting) return;
          cajaCarta.classList.add('is-in');
          const panel = panelDe(elegida());
          if (panel) entrarPlatos(panel);
          ojoCarta.disconnect();
        },
        { threshold: 0.2 }
      );
      ojoCarta.observe(cajaCarta);
    } else {
      cajaCarta.classList.add('is-in');
    }
  }

  /* 10 · Bucle: scroll, cintas y sello -------------------------------------
     Un solo bucle por fotograma. Lo que depende del scroll (barra, línea de
     avance, botón de subir) corre siempre; lo demás, solo con movimiento. */
  const anillos = $$('[data-giro]');
  const marcoInicio = $('.hero__foto');
  const fotosInicio = $('.pase__fotos');
  const arriba = $('[data-arriba]');

  let tiempoAnterior = window.performance.now();
  let yAnterior = window.scrollY;
  let yPintada = -1;
  let rapidez = 0; // píxeles por segundo, suavizada
  let angulo = 0;

  const pintarEstado = (y) => {
    const alto = window.innerHeight;
    const total = raiz.scrollHeight - alto;

    if (barra) barra.classList.toggle('is-bajando', y > 8);
    if (arriba) arriba.classList.toggle('is-visible', y > 600);
    raiz.style.setProperty('--avance', total > 0 ? limitar(y / total, 0, 1).toFixed(4) : '0');

    // Enlace de la barra que corresponde a la sección en pantalla
    let actual = null;
    for (const seccion of secciones) {
      if (seccion.getBoundingClientRect().top <= alto * 0.4) actual = seccion;
    }
    for (const enlace of enlaces) {
      if (actual && enlace.getAttribute('href') === `#${actual.id}`) {
        enlace.setAttribute('aria-current', 'true');
      } else {
        enlace.removeAttribute('aria-current');
      }
    }
  };

  const cuadro = (ahora) => {
    const dt = limitar((ahora - tiempoAnterior) / 1000, 0, 0.05);
    tiempoAnterior = ahora;

    const y = window.scrollY;
    const instantanea = dt > 0 ? (y - yAnterior) / dt : 0;
    yAnterior = y;
    rapidez += (instantanea - rapidez) * Math.min(1, dt * 8);

    if (y !== yPintada) {
      pintarEstado(y);
      yPintada = y;
    }

    if (hayMovimiento()) {
      const enInicio = !hero || !hero.classList.contains('is-fuera');
      const empuje = Math.min(Math.abs(rapidez) * 0.45, 1100);

      // El sello gira solo y el scroll lo acelera
      if (enInicio) {
        angulo = (angulo + (9 + Math.min(Math.abs(rapidez) * 0.05, 240)) * dt) % 360;
        for (const anillo of anillos) anillo.style.setProperty('--giro', `${angulo.toFixed(2)}deg`);

        // Las fotos del inicio se mueven un poco más lento que la página
        if (fotosInicio && marcoInicio) {
          const tope = marcoInicio.offsetHeight * 0.08;
          fotosInicio.style.setProperty('--py', `${Math.min(y * 0.09, tope).toFixed(1)}px`);
        }
      }

      // Las cintas avanzan, frenan bajo el cursor y siguen el impulso al soltarlas
      for (const cinta of cintas) {
        if (!cinta.visible || cinta.agarrada || cinta.conFoco || cinta.periodo <= 0) continue;
        const frenada = cinta.conCursor || Math.abs(cinta.impulso) > 4;
        cinta.ritmo += ((frenada ? 0 : 1) - cinta.ritmo) * Math.min(1, dt * 5);
        cinta.x = (cinta.x + (cinta.base + empuje) * cinta.ritmo * dt) % cinta.periodo;
        if (Math.abs(cinta.impulso) > 4) {
          correr(cinta, cinta.impulso * dt);
          cinta.impulso *= Math.exp(-3.5 * dt);
        } else {
          cinta.impulso = 0;
        }
        pintarCinta(cinta);
      }
    }

    window.requestAnimationFrame(cuadro);
  };

  // Al pausar, el sello y la foto del inicio se quedan donde estaban
  window.addEventListener('resize', () => {
    yPintada = -1;
  });
  window.requestAnimationFrame(cuadro);

  /* 11 · Horario de hoy y año del pie -------------------------------------- */
  const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const hoy = new Date().getDay();
  let horasDeHoy = '';

  for (const horario of $$('[data-horario]')) {
    const fila = $$('[data-dias]', horario).find((li) => li.dataset.dias.split(',').includes(String(hoy)));
    if (!fila) continue;
    fila.classList.add('es-hoy');
    fila.setAttribute('aria-current', 'date');
    const horas = $('.h', fila);
    if (!horasDeHoy && horas) horasDeHoy = horas.textContent.trim();
  }

  const etiquetaHoy = $('[data-hoy-etq]');
  const textoHoy = $('[data-hoy]');
  if (etiquetaHoy && textoHoy && horasDeHoy) {
    etiquetaHoy.textContent = 'Hoy';
    textoHoy.textContent = `${DIAS[hoy]}, de ${horasDeHoy}`;
  }

  const anio = $('[data-anio]');
  if (anio) anio.textContent = String(new Date().getFullYear());

  // Todo arrancó bien: index.html deja activas las mejoras
  window.cafeteriaLista = true;
})();
