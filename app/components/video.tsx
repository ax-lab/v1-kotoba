import React, { useEffect, useState } from 'react'

import { Dir, DirEntry } from '../../lib/video_types'
import { video } from '../api'

import './video.scss'

type VideoState = {
	message?: string
	root?: Dir
	view?: Dir
}

type OpenMap = { [key: string]: boolean }

const entryKey = (entry: DirEntry) => `${entry.path}/${entry.name}`

const Video = () => {
	const [state, setState] = useState({ message: 'Loading...' } as VideoState)
	const [openMap, setOpenMap] = useState({} as OpenMap)
	const setOpen = (key: string, open: boolean) => {
		setOpenMap({ ...openMap, [key]: open })
	}

	const collapseAll = () => setOpenMap({})

	function expandDir(out: OpenMap, dir: Dir) {
		dir.list.forEach((x) => {
			if (x.type == 'dir') {
				out[entryKey(x)] = true
				expandDir(out, x)
			}
		})
		return out
	}

	const expandAll = () => {
		if (state.root) {
			setOpenMap(expandDir({}, state.root))
		}
	}

	const refresh = () => {
		const to = setTimeout(() => setState({ ...state, message: 'Loading...' }), 500)
		video
			.fetch_files()
			.then((root) => {
				setState({ ...state, root, message: '' })
			})
			.catch((err) => {
				setState({ ...state, message: 'Load failed' })
				console.error('Loading video files:', err)
			})
			.finally(() => clearTimeout(to))
	}

	const txtFilter = React.createRef<HTMLInputElement>()

	function filterDir(words: string[], dir: Dir): Dir {
		const out = { ...dir }
		out.list = dir.list
			.map((it) => {
				if (it.type == 'dir') {
					return filterDir(words, it)
				} else {
					return it
				}
			})
			.filter((it) => {
				if (it.type == 'dir') {
					return it.list.length
				}

				const name = it.name.toLowerCase()
				for (const w of words) {
					const negate = w.startsWith('-')
					if (negate) {
						if (w.length > 1 && name.indexOf(w.slice(1)) >= 0) {
							return false
						}
					} else if (name.indexOf(w) < 0) {
						return false
					}
				}
				return true
			})
		return out
	}

	const filter = () => {
		const txt = txtFilter.current && txtFilter.current.value
		const words = txt && txt.length > 2 && txt.split(/\s+/).map((x) => x.toLowerCase())
		if (state.root && words && words.length) {
			const view = filterDir(words, state.root)
			setState({ ...state, view: view, message: view.list.length ? '' : 'No results' })
			setOpenMap(expandDir({}, view))
		} else {
			setState({ ...state, view: undefined, message: '' })
		}
	}

	useEffect(() => {
		refresh()
	}, [])
	return (
		<>
			<h2>Video</h2>
			<hr />
			<div className="video-toolbar">
				<button className="fas fa-sync" title="Refresh" onClick={refresh}></button>
				<button className="fas fa-minus-square" title="Collapse all" onClick={collapseAll}></button>
				<button className="fas fa-plus-square" title="Expand all" onClick={expandAll}></button>
				<input ref={txtFilter} type="search" placeholder="Filter..." spellCheck={false} onInput={filter} />
			</div>
			<div className="video-files">
				{state.message && <div>{state.message}</div>}
				{state.root && <FileList root={state.view || state.root} open openMap={openMap} setOpen={setOpen} />}
			</div>
		</>
	)
}

export default Video

type FileEntryProps = {
	key: string
	entry: DirEntry
	openMap: OpenMap
	setOpen: (key: string, open: boolean) => void
}

const FileIcon = ({ type, open }: { type: 'dir' | 'video' | 'subtitle'; open?: boolean }) => {
	switch (type) {
		case 'dir':
			return <i className={`far fa-folder${open ? '-open' : ''}`} />
		case 'video':
			return <i className="far fa-file-video" />
		case 'subtitle':
			return <i className="far fa-file-alt" />
		default:
			return <i className="far fa-file" />
	}
}

const FileEntry = ({ entry, openMap, setOpen }: FileEntryProps) => {
	const key = `${entry.path}/${entry.name}`
	const toggleOpen = (ev: React.MouseEvent<HTMLLIElement>) => {
		if (entry.type == 'dir') {
			setOpen(key, !openMap[key])
		}
		ev.stopPropagation()
	}
	const isOpen = entry.type == 'dir' && openMap[key]
	return (
		<>
			<li onClick={(ev) => toggleOpen(ev)} className={isOpen ? 'open' : ''}>
				<FileIcon type={entry.type} open={isOpen} />
				{entry.name}
				{entry.type == 'dir' && <FileList root={entry} open={isOpen} openMap={openMap} setOpen={setOpen} />}
			</li>
		</>
	)
}

type FileListProps = {
	root: Dir
	open?: boolean
	openMap: OpenMap
	setOpen: (key: string, open: boolean) => void
}

const FileList = ({ root, open, openMap, setOpen }: FileListProps) => (
	<ul className="video-file-list" style={{ display: open ? '' : 'none' }}>
		{root.list.map((it) => (
			<FileEntry key={`${it.path}/${it.name}`} entry={it} openMap={openMap} setOpen={setOpen} />
		))}
	</ul>
)
