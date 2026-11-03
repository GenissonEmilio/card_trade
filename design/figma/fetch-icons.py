from pathlib import Path
import urllib.request, concurrent.futures
out=Path(__file__).resolve().parent/'icons'; out.mkdir(exist_ok=True)
names=['cards-three','arrows-clockwise','users-three','sparkle','seal-check','arrow-up-right','plus','arrow-down','magnifying-glass','faders-horizontal','caret-down','heart','map-pin','cards','list','sword','magic-wand','shield','intersect','circles-three','stack','link']
base='https://raw.githubusercontent.com/phosphor-icons/core/main/assets/duotone/'
def get(name):
    url=base+name+'-duotone.svg'
    with urllib.request.urlopen(url,timeout=25) as r: content=r.read()
    (out/(name+'.svg')).write_bytes(content)
    return name
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
    for name in pool.map(get,names): print(name)
with urllib.request.urlopen('https://raw.githubusercontent.com/phosphor-icons/core/main/LICENSE',timeout=25) as r: (out/'LICENSE').write_bytes(r.read())
(out/'SOURCES.md').write_text('''# Iconografia

Família selecionada no catálogo público 21st Icons: https://docs.21st.dev/community/icons/phosphor

Categoria consultada: https://docs.21st.dev/community/icons/c/gaming

Arquivos SVG obtidos da fonte oficial Phosphor Icons: https://github.com/phosphor-icons/core/tree/main/assets/duotone

Licença MIT, preservada em LICENSE. Ícones duotone com cores de aplicação Duelink. O conector MCP do 21st.dev não estava disponível; a consulta foi ao catálogo público, com obtenção dos SVGs na fonte oficial.
''',encoding='utf-8')
