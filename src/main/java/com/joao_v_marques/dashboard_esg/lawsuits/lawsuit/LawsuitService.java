package com.joao_v_marques.dashboard_esg.lawsuits.lawsuit;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class LawsuitService {

    private LawsuitRepository repository;

    public LawsuitService(LawsuitRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<>
}
