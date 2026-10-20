package com.joao_v_marques.dashboard_esg.nip;

import com.joao_v_marques.dashboard_esg.nip.dto.NipNatureResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class NipNatureService {

    private final NipNatureRepository nipNatureRepository;

    public NipNatureService(NipNatureRepository nipNatureRepository) {
        this.nipNatureRepository = nipNatureRepository;
    }

    @Transactional(readOnly = true)
    public List<NipNatureResponse> findAll() {
        return nipNatureRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private NipNatureResponse toResponse(NipNature nipNature) {
        return new NipNatureResponse(
                nipNature.getId(),
                nipNature.getName(),
                nipNature.getDescription()
        );
    }
}
