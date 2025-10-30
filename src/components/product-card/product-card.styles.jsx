import styled from "styled-components";

export const ProductCardContainer = styled.div`
  width: 100%;
  max-width: 300px;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  overflow: hidden;

  @media (min-width: 768px) {
    max-width: 240px;
  }

  img {
    width: 100%;
    aspect-ratio: 1 / 1;
    object-fit: cover;
    border-radius: 0.5rem;
    transition: opacity 0.3s ease;
  }

  button {
    width: 80%;
    opacity: 0;
    transition: opacity 0.3s ease;
    margin-top: -3rem;
    z-index: 1;

    @media (hover: hover) {
      display: none;
      position: absolute;
      bottom: 1rem;
    }
  }

  @media (hover: hover) {
    &:hover img {
      opacity: 0.8;
    }

    &:hover button {
      opacity: 0.85;
      display: flex;
    }
  }
`;

export const Footer = styled.div`
  width: 100%;
  display: flex;
  justify-content: space-between;
  font-size: 1rem;
  margin-top: 0.5rem;
`;

export const Name = styled.span`
  flex: 1;
  margin-right: 0.5rem;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
`;

export const Price = styled.span`
  font-weight: bold;
`;
