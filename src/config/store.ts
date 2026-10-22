export interface StoreBranch {
  name: string
  address: string
  phone: string
  mapUrl: string
}

export interface StoreConfig {
  nameAr: string
  nameEn: string
  description: string
  branchesHeading: string
  phone: string
  whatsapp?: string
  address: string
  location: {
    latitude?: number
    longitude?: number
    mapUrl: string
    embedUrl: string
  }
  branches: StoreBranch[]
  social?: {
    facebook?: string
    instagram?: string
  }
}

const address = 'شارع الهرم - مدينة بيتكو - مطعم جاد 32'
const phone = '01128929398'
const mapQuery = encodeURIComponent(address)
const mapUrl = `https://www.google.com/maps/search/?api=1&query=${mapQuery}`

export const storeConfig: StoreConfig = {
  nameAr: 'سويت درينك الهرم',
  nameEn: 'Sweet Drink Alharam',
  description: 'المنيو الرقمي الرسمي لـ sweet Drink Alharam: عصائر فريش، كوكتيلات، ميلك شيك، محمصات، وجراكن باللتر.',
  branchesHeading: 'الهرم - فيصل - المريوطية - ش التحرير - البحوث - ش مصر والسودان',
  phone,
  address,
  location: {
    mapUrl,
    embedUrl: `https://www.google.com/maps?q=${mapQuery}&output=embed`,
  },
  branches: [
    {
      name: 'سويت درينك الهرم',
      address,
      phone,
      mapUrl,
    },
  ],
}
