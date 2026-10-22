import { getFallbackProductImage, getProductImage } from '../data/productImages'
import type { Product } from '../types/menu'

interface CategoryTileProps {
  visualKey: string | undefined
  size?: 'sm' | 'lg'
  product?: Product
}

/** Product photography is resolved by the stable catalog product ID. */
export default function CategoryTile({ size = 'sm', product }: CategoryTileProps) {
  const source = product ? getProductImage(product) : getFallbackProductImage()
  const dims = size === 'lg' ? 'h-24 w-24' : 'h-[148px] w-full min-[390px]:h-[116px]'

  return (
    <div
      className={`${dims} relative shrink-0 overflow-hidden rounded-[18px] bg-[#f4efe5]`}
    >
      <img
        src={source.url}
        alt={product?.name ?? ''}
        loading="lazy"
        width={360}
        height={260}
        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        onError={(event) => {
          const fallbackUrl = getFallbackProductImage().url
          if (event.currentTarget.src !== fallbackUrl) {
            event.currentTarget.src = fallbackUrl
          } else {
            event.currentTarget.style.display = 'none'
          }
        }}
      />
    </div>
  )
}
