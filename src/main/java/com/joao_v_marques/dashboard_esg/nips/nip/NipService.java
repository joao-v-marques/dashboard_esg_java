package com.joao_v_marques.dashboard_esg.nips.nip;

import com.joao_v_marques.dashboard_esg.nips.nip.dto.NipResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class NipService {

    private final NipRepository nipRepository;

    public NipService(NipRepository nipRepository) {
        this.nipRepository = nipRepository;
    }

    @Transactional(readOnly = true)
    public List<NipResponse> findAll() {
        return nipRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private NipResponse toResponse(Nip nip) {
        return new NipResponse(
                nip.getId(),
                nip.getNipNumber(),
                nip.getNotificationDate(),
                nip.getDemandCode(),
                nip.getProtocolCode(),
                nip.getBeneficiaryName(),
                nip.getBeneficiaryCpf(),
                nip.getDescription(),
                nip.getResponseDescription(),
                nip.getStatus().getId(),
                nip.getStatus().getName(),
                nip.getNature().getId(),
                nip.getNature().getName(),
                nip.getInsertedBy().getName(),
                nip.getCreatedAt(),
                nip.getUpdatedAt(),
                nip.getUpdatedBy() != null ? nip.getUpdatedBy().getName() : null
        );
    }
}
