// Icons copied from the NextAdmin repo (utils/icon, table demos) that the layout icon files lack.
import type { SVGProps } from 'react'

export const AltArrowLeftIcon = (props: SVGProps<SVGSVGElement>) => {
    return (
        <svg
            {...props}
            xmlns='http://www.w3.org/2000/svg'
            width={20}
            height={20}
            viewBox='0 0 20 20'
            fill='none'
        >
            <path
                d='M12.5 4.58335L7.5 10L12.5 15.4167'
                stroke='currentColor'
                strokeWidth='1.5'
                strokeLinecap='round'
                strokeLinejoin='round'
            />
        </svg>
    );
};

export const AltArrowRightIcon = (props: SVGProps<SVGSVGElement>) => {
    return (
        <svg
            {...props}
            xmlns='http://www.w3.org/2000/svg'
            width={20}
            height={20}
            viewBox='0 0 20 20'
            fill='none'
        >
            <path
                d='M7.5 15.4166L12.5 9.99998L7.5 4.58331'
                stroke='currentColor'
                strokeWidth='1.5'
                strokeLinecap='round'
                strokeLinejoin='round'
            />
        </svg>
    );
};

export const ArrowRightUpIcon = (props: SVGProps<SVGSVGElement>) => {
    return (
        <svg
            {...props}
            xmlns='http://www.w3.org/2000/svg'
            width={20}
            height={20}
            viewBox='0 0 20 20'
            fill='none'
        >
            <path
                d='M5 15L15 5M15 12.5V5H7.5'
                stroke='currentColor'
                strokeWidth='1.5'
                strokeLinecap='round'
                strokeLinejoin='round'
            />
        </svg>
    );
};

export const AltArrowUpIcon = (props: SVGProps<SVGSVGElement>) => {
    return (
        <svg
            {...props}
            xmlns='http://www.w3.org/2000/svg'
            width={18}
            height={18}
            viewBox='0 0 18 18'
            fill='none'
        >
            <path
                d='M13.875 11.25L9 6.75L4.125 11.25'
                stroke='currentColor'
                strokeWidth='1.3'
                strokeLinecap='round'
                strokeLinejoin='round'
            />
        </svg>
    );
};

export function FilterIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16" fill="none">
      <g clipPath="url(#clip0_23223_80383)">
        <path
          d="M12.6667 2H3.33337C2.39056 2 1.91916 2 1.62627 2.2748C1.33337 2.5496 1.33337 2.99188 1.33337 3.87644V4.33632C1.33337 5.02821 1.33337 5.37416 1.50644 5.66095C1.67951 5.94773 1.99569 6.12572 2.62805 6.4817L4.57007 7.57492C4.99435 7.81376 5.20649 7.93318 5.35838 8.06505C5.6747 8.33966 5.86943 8.66234 5.95767 9.05811C6.00004 9.24816 6.00004 9.47054 6.00004 9.91529L6.00004 11.6949C6.00004 12.3013 6.00004 12.6045 6.16799 12.8409C6.33594 13.0772 6.63423 13.1938 7.23081 13.427C8.48323 13.9166 9.10944 14.1614 9.55474 13.8829C10 13.6044 10 12.9679 10 11.6949V9.91529C10 9.47054 10 9.24816 10.0424 9.05811C10.1307 8.66234 10.3254 8.33966 10.6417 8.06505C10.7936 7.93318 11.0057 7.81376 11.43 7.57492L13.372 6.4817C14.0044 6.12572 14.3206 5.94773 14.4936 5.66095C14.6667 5.37416 14.6667 5.02821 14.6667 4.33632V3.87644C14.6667 2.99188 14.6667 2.5496 14.3738 2.2748C14.0809 2 13.6095 2 12.6667 2Z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </g>
      <defs>
        <clipPath id="clip0_23223_80383">
          <rect width={16} height={16} fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}

export const DownloadIcon = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16" fill="none">
      <path
        d="M2 10C2 11.8856 2 12.8284 2.58579 13.4142C3.17157 14 4.11438 14 6 14H10C11.8856 14 12.8284 14 13.4142 13.4142C14 12.8284 14 11.8856 14 10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.00004 1.99984V10.6665M5.33337 7.74984L8.00004 10.6665L10.6667 7.74984"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export const EyeIcon = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width={20} height={20} viewBox="0 0 20 20" fill="none">
      <path
        d="M2.72907 12.7464C2.02079 11.8262 1.66666 11.3661 1.66666 9.99998C1.66666 8.63383 2.02079 8.17375 2.72907 7.25359C4.14329 5.41628 6.51508 3.33331 9.99999 3.33331C13.4849 3.33331 15.8567 5.41628 17.2709 7.25359C17.9792 8.17375 18.3333 8.63383 18.3333 9.99998C18.3333 11.3661 17.9792 11.8262 17.2709 12.7464C15.8567 14.5837 13.4849 16.6666 9.99999 16.6666C6.51508 16.6666 4.14329 14.5837 2.72907 12.7464Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M12.5 10C12.5 11.3807 11.3807 12.5 10 12.5C8.61929 12.5 7.5 11.3807 7.5 10C7.5 8.61929 8.61929 7.5 10 7.5C11.3807 7.5 12.5 8.61929 12.5 10Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
};

export const TrashBinIcon = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width={20} height={20} viewBox="0 0 20 20" fill="none">
      <path d="M17.0833 5H2.9166" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M15.6944 7.08331L15.3111 12.8326C15.1637 15.045 15.0899 16.1512 14.3691 16.8256C13.6482 17.5 12.5396 17.5 10.3222 17.5H9.67775C7.46042 17.5 6.35175 17.5 5.63091 16.8256C4.91007 16.1512 4.83632 15.045 4.68883 12.8326L4.30554 7.08331"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M7.91666 9.16669L8.33332 13.3334"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M12.0833 9.16669L11.6667 13.3334"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M5.41666 5C5.46322 5 5.48651 5 5.50761 4.99947C6.19382 4.98208 6.79918 4.54576 7.03267 3.90027C7.03985 3.88041 7.04722 3.85832 7.06194 3.81415L7.14285 3.57143C7.21191 3.36423 7.24645 3.26063 7.29225 3.17267C7.475 2.82173 7.81311 2.57803 8.20383 2.51564C8.30176 2.5 8.41097 2.5 8.62937 2.5H11.3706C11.589 2.5 11.6982 2.5 11.7961 2.51564C12.1869 2.57803 12.525 2.82173 12.7077 3.17267C12.7535 3.26063 12.7881 3.36423 12.8571 3.57143L12.938 3.81415C12.9527 3.85826 12.9601 3.88042 12.9673 3.90027C13.2008 4.54576 13.8062 4.98208 14.4924 4.99947C14.5135 5 14.5368 5 14.5833 5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
};

