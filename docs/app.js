const APERTURAS = ["2026-12-01", "2026-12-07", "2026-12-14", "2026-12-21"];
const CIERRE = "2026-12-26";
const TOTAL = 5;

export function normalizarRut(valor) {
  const limpio = String(valor ?? "").replace(/[.\-\s]/g, "").toUpperCase();
  if (!/^\d{1,8}[\dK]$/.test(limpio)) return "";
  const cuerpo = limpio.slice(0, -1).replace(/^0+(?=\d)/, "");
  if (Number(cuerpo) === 0) return "";
  return `${cuerpo}-${limpio.slice(-1)}`;
}

export function validarRut(valor) {
  const rut = normalizarRut(valor);
  if (!rut) return false;
  const [cuerpo, dv] = rut.split("-");
  let suma = 0;
  let factor = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const resto = 11 - (suma % 11);
  const esperado = resto === 11 ? "0" : resto === 10 ? "K" : String(resto);
  return dv === esperado;
}

function fechaChile() {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(new Date());
  const dato = tipo => partes.find(p => p.type === tipo).value;
  return `${dato("year")}-${dato("month")}-${dato("day")}`;
}

function estadoSemana(semana) {
  const hoy = fechaChile();
  if (hoy < APERTURAS[semana - 1]) return "proxima";
  if (hoy > CIERRE) return "cerrada";
  return "abierta";
}

function elemento(etiqueta, clase, contenido) {
  const nodo = document.createElement(etiqueta);
  if (clase) nodo.className = clase;
  if (contenido !== undefined) nodo.textContent = contenido;
  return nodo;
}

function enlace(texto, destino, clase = "") {
  const nodo = elemento("a", clase, texto);
  nodo.href = destino;
  return nodo;
}

function boton(texto, clase = "button") {
  const nodo = elemento("button", clase, texto);
  nodo.type = "button";
  return nodo;
}

function anunciar(texto) {
  document.getElementById("status").textContent = texto;
}

function mostrar(pantalla, anuncio = "") {
  const raiz = document.getElementById("app");
  raiz.replaceChildren(pantalla);
  const titulo = pantalla.querySelector("h1");
  if (titulo) {
    titulo.tabIndex = -1;
    titulo.focus({ preventScroll: true });
  }
  if (anuncio) anunciar(anuncio);
}

function cabecera(sobretitulo, titulo, descripcion) {
  const caja = elemento("section", "intro-card");
  caja.append(elemento("p", "eyebrow", sobretitulo), elemento("h1", "", titulo));
  if (descripcion) caja.append(elemento("p", "lead", descripcion));
  return caja;
}

function aviso(texto, tipo = "info") {
  return elemento("p", `notice notice-${tipo}`, texto);
}

function cargarError(texto) {
  const caja = cabecera("Trivia de seguridad", "No pudimos abrir esta página", texto);
  caja.append(enlace("Volver a las semanas", "./", "button"));
  mostrar(caja, texto);
}

function renderPortada(datos) {
  const pantalla = elemento("div", "page-stack");
  const intro = cabecera("Campaña de seguridad · Diciembre 2026", "Desde lo básico", "Cuatro semanas para seguir una tarea desde el mapa de procesos hasta la conversación del turno. Responde cinco preguntas por semana. Cada respuesta correcta suma un punto para el concurso.");
  intro.append(elemento("p", "intro-note", "Un intento por RUT en cada semana. Todas las trivias cierran el 26 de diciembre a las 23:59, hora de Chile."));
  if (!window.CONFIG?.SCRIPT_URL) intro.append(aviso("Modo demo: puedes recorrer las preguntas, pero tus respuestas no se guardarán ni tendrán puntaje.", "demo"));
  pantalla.append(intro);
  const lista = elemento("section", "week-list");
  lista.setAttribute("aria-label", "Trivias por semana");
  for (let semana = 1; semana <= 4; semana++) {
    const info = datos[String(semana)];
    const estado = estadoSemana(semana);
    const tarjeta = elemento("article", "week-card");
    const encabezado = elemento("div", "week-card-top");
    encabezado.append(elemento("p", "eyebrow", `Semana ${semana}`));
    encabezado.append(elemento("span", `badge badge-${estado}`, estado === "proxima" ? "Próxima" : estado === "abierta" ? "Abierta" : "Cerrada"));
    tarjeta.append(encabezado, elemento("h2", "", info.titulo), elemento("p", "", info.bajada));
    const fecha = APERTURAS[semana - 1].split("-")[2];
    tarjeta.append(elemento("p", "date-label", `Abre el ${Number(fecha)} de diciembre`));
    if (estado === "abierta") tarjeta.append(enlace(`Responder semana ${semana}`, `?s=${semana}`, "button"));
    else tarjeta.append(elemento("p", "unavailable", estado === "proxima" ? "Disponible desde la fecha indicada" : "Plazo terminado"));
    lista.append(tarjeta);
  }
  pantalla.append(lista);
  mostrar(pantalla);
}

function renderNoDisponible(semana, datos) {
  const estado = estadoSemana(semana);
  const info = datos[String(semana)];
  const texto = estado === "proxima"
    ? `La semana ${semana} abre el ${Number(APERTURAS[semana - 1].slice(-2))} de diciembre, hora de Chile.`
    : "El concurso cerró el 26 de diciembre a las 23:59, hora de Chile.";
  const caja = cabecera(`Semana ${semana} · ${info.titulo}`, estado === "proxima" ? "Aún no abre" : "Trivia cerrada", texto);
  caja.append(enlace("Ver las cuatro semanas", "./", "button"));
  mostrar(caja, texto);
}

function renderPregunta(semana, datos, respuestas, indice) {
  const info = datos[String(semana)];
  const pregunta = info.preguntas[indice];
  const pantalla = elemento("section", "quiz-card");
  pantalla.append(elemento("p", "eyebrow", `Semana ${semana} · ${info.titulo}`));
  pantalla.append(elemento("h1", "quiz-title", `Pregunta ${indice + 1} de ${TOTAL}`));
  const progreso = elemento("div", "progress-track");
  progreso.setAttribute("role", "progressbar");
  progreso.setAttribute("aria-valuemin", "0");
  progreso.setAttribute("aria-valuemax", String(TOTAL));
  progreso.setAttribute("aria-valuenow", String(indice));
  progreso.setAttribute("aria-label", "Preguntas respondidas");
  const relleno = elemento("div", "progress-fill");
  relleno.style.width = `${indice / TOTAL * 100}%`;
  progreso.append(relleno);
  pantalla.append(progreso);
  const grupo = elemento("fieldset", "options");
  grupo.append(elemento("legend", "question-text", pregunta.texto));
  pregunta.opciones.forEach((opcion, posicion) => {
    const etiqueta = elemento("label", "option");
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = `pregunta-${indice}`;
    radio.value = String(posicion);
    radio.checked = respuestas[indice] === posicion;
    radio.addEventListener("change", () => {
      respuestas[indice] = posicion;
      siguiente.disabled = false;
      anunciar("Opción seleccionada");
    });
    etiqueta.append(radio, elemento("span", "option-text", opcion));
    grupo.append(etiqueta);
  });
  pantalla.append(grupo);
  const acciones = elemento("div", "actions");
  if (indice > 0) {
    const anterior = boton("Anterior", "button button-secondary");
    anterior.addEventListener("click", () => renderPregunta(semana, datos, respuestas, indice - 1));
    acciones.append(anterior);
  }
  const siguiente = boton(indice === TOTAL - 1 ? "Terminar preguntas" : "Siguiente");
  siguiente.disabled = !Number.isInteger(respuestas[indice]);
  siguiente.addEventListener("click", () => {
    if (!Number.isInteger(respuestas[indice])) return;
    if (indice === TOTAL - 1) renderFormulario(semana, datos, respuestas);
    else renderPregunta(semana, datos, respuestas, indice + 1);
  });
  acciones.append(siguiente);
  pantalla.append(acciones);
  mostrar(pantalla, `Pregunta ${indice + 1} de ${TOTAL}`);
}

function campo(id, etiqueta, tipo, auto) {
  const contenedor = elemento("div", "field");
  const label = elemento("label", "", etiqueta);
  label.htmlFor = id;
  const input = document.createElement("input");
  input.id = id;
  input.name = id;
  input.type = tipo;
  input.autocomplete = auto;
  input.required = true;
  input.maxLength = id === "rut" ? 20 : 80;
  contenedor.append(label, input);
  return { contenedor, input };
}

function renderFormulario(semana, datos, respuestas) {
  const info = datos[String(semana)];
  const pantalla = elemento("section", "quiz-card");
  pantalla.append(elemento("p", "eyebrow", `Semana ${semana} · ${info.titulo}`));
  pantalla.append(elemento("h1", "", "Último paso"));
  pantalla.append(elemento("p", "lead", "Deja tus datos para sumar tus respuestas al concurso. Solo puedes enviar una vez por semana."));
  if (!window.CONFIG?.SCRIPT_URL) pantalla.append(aviso("Modo demo: este formulario no enviará ni guardará tus datos. Tampoco mostrará puntaje.", "demo"));
  const formulario = document.createElement("form");
  formulario.noValidate = true;
  const nombre = campo("nombre", "Nombre y apellido", "text", "name");
  const rut = campo("rut", "RUT", "text", "off");
  rut.input.inputMode = "text";
  rut.input.placeholder = "12.345.678-5";
  rut.input.setAttribute("aria-describedby", "rut-ayuda");
  rut.contenedor.append(elemento("p", "field-help", "Puedes escribirlo con o sin puntos y guion."));
  rut.contenedor.lastChild.id = "rut-ayuda";
  const empresa = campo("empresa", "Empresa", "text", "organization");
  formulario.append(nombre.contenedor, rut.contenedor, empresa.contenedor);
  const acepta = elemento("label", "consent");
  const casilla = document.createElement("input");
  casilla.type = "checkbox";
  casilla.required = true;
  acepta.append(casilla, elemento("span", "", "Uso mis datos solo para el concurso"));
  formulario.append(acepta);
  const error = elemento("p", "form-error");
  error.setAttribute("role", "alert");
  formulario.append(error);
  const acciones = elemento("div", "actions");
  const volver = boton("Volver a preguntas", "button button-secondary");
  volver.addEventListener("click", () => renderPregunta(semana, datos, respuestas, TOTAL - 1));
  const enviar = document.createElement("button");
  enviar.type = "submit";
  enviar.className = "button";
  enviar.textContent = window.CONFIG?.SCRIPT_URL ? "Enviar respuestas" : "Terminar demo";
  acciones.append(volver, enviar);
  formulario.append(acciones);
  formulario.addEventListener("submit", async evento => {
    evento.preventDefault();
    error.textContent = "";
    if (nombre.input.value.trim().length < 2) { error.textContent = "Escribe tu nombre y apellido."; nombre.input.focus(); return; }
    if (!validarRut(rut.input.value)) { error.textContent = "Revisa el RUT. El dígito verificador no coincide."; rut.input.focus(); return; }
    if (!empresa.input.value.trim()) { error.textContent = "Escribe tu empresa."; empresa.input.focus(); return; }
    if (!casilla.checked) { error.textContent = "Acepta el uso de datos para participar."; casilla.focus(); return; }
    if (!window.CONFIG?.SCRIPT_URL) { renderResultadoDemo(); return; }
    enviar.disabled = true;
    enviar.textContent = "Enviando…";
    anunciar("Enviando respuestas");
    try {
      const resultado = await pedirJson(window.CONFIG.SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          semana,
          respuestas,
          nombre: nombre.input.value.trim(),
          rut: normalizarRut(rut.input.value),
          empresa: empresa.input.value.trim(),
          consentimiento: true
        })
      });
      if (!resultado.ok) {
        error.textContent = mensajeError(resultado.error);
        anunciar(error.textContent);
        return;
      }
      renderResultado(semana, resultado.puntaje, resultado.total);
    } catch {
      error.textContent = "No pudimos enviar tus respuestas. Revisa tu conexión e inténtalo de nuevo.";
      anunciar(error.textContent);
    } finally {
      enviar.disabled = false;
      enviar.textContent = "Enviar respuestas";
    }
  });
  pantalla.append(formulario);
  mostrar(pantalla, "Respuestas completas. Falta el envío.");
}

function mensajeError(codigo) {
  const mensajes = {
    duplicado: "Este RUT ya respondió esta semana. Solo se permite un intento.",
    fuera_de_plazo: "Esta trivia está fuera de plazo. Revisa las fechas en la portada.",
    rut_invalido: "Revisa el RUT. El dígito verificador no coincide.",
    datos_invalidos: "Revisa los datos y vuelve a intentar.",
    respuestas_invalidas: "Falta una respuesta. Vuelve a las preguntas y revisa tu selección.",
    no_configurada: "El concurso todavía no está disponible. Inténtalo más tarde."
  };
  return mensajes[codigo] || "No pudimos registrar tus respuestas. Inténtalo de nuevo.";
}

async function pedirJson(url, opciones = {}) {
  const control = new AbortController();
  const espera = setTimeout(() => control.abort(), 20000);
  try {
    const respuesta = await fetch(url, { ...opciones, signal: control.signal, cache: "no-store" });
    if (!respuesta.ok) throw new Error("HTTP");
    return await respuesta.json();
  } finally {
    clearTimeout(espera);
  }
}

function renderResultado(semana, puntaje, total) {
  const pantalla = cabecera(`Semana ${semana} · Respuestas registradas`, "Listo, ya sumaste", "Tus respuestas quedaron guardadas para el concurso.");
  pantalla.append(elemento("p", "score", `${puntaje} de ${total}`));
  pantalla.append(elemento("p", "score-label", "respuestas correctas esta semana"));
  pantalla.append(elemento("p", "result-note", "Tu puntaje de las cuatro semanas se acumula por RUT. En el ranking se muestra solo tu nombre."));
  const acciones = elemento("div", "actions");
  acciones.append(enlace("Ver ranking", "?ranking", "button"), enlace("Ver semanas", "./", "button button-secondary"));
  pantalla.append(acciones);
  mostrar(pantalla, `Respuestas registradas. ${puntaje} de ${total} correctas.`);
}

function renderResultadoDemo() {
  const pantalla = cabecera("Modo demo", "Recorrido terminado", "Tus respuestas no se guardaron. El puntaje solo estará disponible cuando se conecte el concurso.");
  pantalla.append(enlace("Volver a las semanas", "./", "button"));
  mostrar(pantalla, "Demo terminada. No se guardaron respuestas.");
}

async function renderRanking() {
  const pantalla = elemento("div", "page-stack");
  const intro = cabecera("Concurso · Diciembre 2026", "Ranking", "Cada respuesta correcta suma un punto. El ranking reúne las cuatro semanas por RUT y muestra solo el nombre. Los empates los resuelve la DSSO.");
  pantalla.append(intro);
  if (!window.CONFIG?.SCRIPT_URL) {
    pantalla.append(aviso("Modo demo: el ranking no está conectado y no hay puntajes guardados.", "demo"));
    mostrar(pantalla);
    return;
  }
  const contenido = elemento("section", "ranking-card");
  contenido.append(elemento("p", "", "Cargando ranking…"));
  pantalla.append(contenido);
  mostrar(pantalla);
  try {
    const url = new URL(window.CONFIG.SCRIPT_URL);
    url.searchParams.set("accion", "ranking");
    const datos = await pedirJson(url.toString());
    if (!datos.ok || !Array.isArray(datos.ranking)) throw new Error("ranking");
    contenido.replaceChildren();
    if (!datos.ranking.length) {
      contenido.append(elemento("p", "", "Todavía no hay respuestas registradas."));
      return;
    }
    const lista = elemento("ol", "ranking-list");
    datos.ranking.slice(0, 10).forEach((persona, indice) => {
      const fila = elemento("li", "ranking-row");
      fila.append(elemento("span", "rank-number", String(indice + 1)), elemento("span", "rank-name", String(persona.nombre)), elemento("strong", "rank-score", `${persona.puntaje} ${persona.puntaje === 1 ? "punto" : "puntos"}`));
      lista.append(fila);
    });
    contenido.append(lista);
  } catch {
    contenido.replaceChildren(aviso("No pudimos cargar el ranking. Revisa tu conexión e inténtalo más tarde.", "error"));
  }
}

async function iniciar() {
  const parametros = new URLSearchParams(location.search);
  if (parametros.has("ranking")) { await renderRanking(); return; }
  let datos;
  try {
    const respuesta = await fetch("./preguntas.json", { cache: "no-store" });
    if (!respuesta.ok) throw new Error("preguntas");
    datos = await respuesta.json();
  } catch {
    cargarError("No pudimos cargar las preguntas. Revisa tu conexión e inténtalo de nuevo.");
    return;
  }
  if (!parametros.has("s")) { renderPortada(datos); return; }
  const valor = parametros.get("s");
  if (!/^[1-4]$/.test(valor)) { cargarError("Esa semana no existe."); return; }
  const semana = Number(valor);
  if (estadoSemana(semana) !== "abierta") { renderNoDisponible(semana, datos); return; }
  renderPregunta(semana, datos, Array(TOTAL).fill(null), 0);
}

if (typeof document !== "undefined") iniciar();
