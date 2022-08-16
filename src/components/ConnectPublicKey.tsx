import { FC, useState, useEffect, useRef, useCallback } from "react"
import { mapping, letters } from "../lib/mapping"
import { PublicKey } from "@solana/web3.js"

import Link from "next/link"

export interface Props {
  data: any
}

export const ConnectPublicKey: FC<Props> = (props) => {
  const [key, setKey] = useState("")

  function generateURLandKeypair() {
    let seed = []
    let url = ""

    for (let i = 0; i < 8; i++) {
      let rand = Math.floor(Math.random() * 62)
      let key = letters[rand]
      url += key

      const u8s = mapping[key]
      seed = seed.concat(u8s)
    }

    setKey(url)

  }

  useEffect(() => {
    generateURLandKeypair()
  }, [])

  return (
    <div className="py-4 sm:py-5 sm:grid sm:grid-cols-1 sm:gap-4 sm:px-6">
      <Link
        href={{
          pathname: "/[slug]",
          query: {
            slug: key,
            data: props.data.toString(),
          },
        }}
      >
        <button className="px-2 m-1 btn animate-pulse bg-gradient-to-r from-[#9945FF] to-[#14F195] hover:from-pink-200 hover:to-yellow-500 ...">
          New Link
        </button>
      </Link>
    </div>
  )
}
