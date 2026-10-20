package com.joao_v_marques.dashboard_esg.nips.nip;

import org.springframework.data.jpa.repository.JpaRepository;

public interface NipRepository extends JpaRepository<Nip, Integer> {

    boolean existsByNipNumber(String nipNumber);

    boolean existsByProtocolCode(String protocolCode);

    // Usados no PUT, para validar duplicidade ignorando a própria NIP editada
    boolean existsByNipNumberAndIdNot(String nipNumber, Integer id);

    boolean existsByProtocolCodeAndIdNot(String protocolCode, Integer id);
}
